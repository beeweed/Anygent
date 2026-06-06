from __future__ import annotations

import asyncio
import posixpath
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import PurePosixPath
from typing import Any
from uuid import uuid4

from e2b import Sandbox
from e2b.sandbox.filesystem.filesystem import FileType

from src.agent.models import FileTreeNode, SandboxSessionResponse
from src.config.settings import settings


class SandboxServiceError(Exception):
    pass


class SandboxPathError(SandboxServiceError):
    pass


class SandboxFileNotFoundError(SandboxServiceError):
    pass


@dataclass(slots=True)
class SandboxSessionRecord:
    session_id: str
    sandbox: Sandbox
    sandbox_id: str
    template_id: str | None
    timeout_seconds: int
    created_at: datetime


class SandboxService:
    def __init__(self) -> None:
        self._sessions: dict[str, SandboxSessionRecord] = {}
        self._lock = asyncio.Lock()

    def has_session(self, session_id: str) -> bool:
        return session_id in self._sessions

    async def create_session(
        self,
        *,
        api_key: str,
        template_id: str | None,
        timeout_seconds: int,
        session_id: str | None = None,
    ) -> SandboxSessionResponse:
        async with self._lock:
            sandbox = await asyncio.to_thread(
                Sandbox.create,
                api_key=api_key,
                timeout=timeout_seconds,
                template=template_id or None,
            )
            record = SandboxSessionRecord(
                session_id=session_id or str(uuid4()),
                sandbox=sandbox,
                sandbox_id=sandbox.sandbox_id,
                template_id=template_id or None,
                timeout_seconds=timeout_seconds,
                created_at=datetime.now(timezone.utc),
            )
            self._sessions[record.session_id] = record

        tree = await self.list_tree(record.session_id)
        return SandboxSessionResponse(
            session_id=record.session_id,
            sandbox_id=record.sandbox_id,
            template_id=record.template_id,
            timeout_seconds=record.timeout_seconds,
            created_at=record.created_at,
            tree=tree,
        )

    async def ensure_session(
        self,
        *,
        session_id: str,
        api_key: str,
        template_id: str | None,
        timeout_seconds: int,
    ) -> SandboxSessionResponse:
        existing = self._sessions.get(session_id)
        if existing is not None:
            return SandboxSessionResponse(
                session_id=existing.session_id,
                sandbox_id=existing.sandbox_id,
                template_id=existing.template_id,
                timeout_seconds=existing.timeout_seconds,
                created_at=existing.created_at,
                tree=await self.list_tree(existing.session_id),
            )

        return await self.create_session(
            api_key=api_key,
            template_id=template_id,
            timeout_seconds=timeout_seconds,
            session_id=session_id,
        )

    def get_record(self, session_id: str) -> SandboxSessionRecord:
        record = self._sessions.get(session_id)
        if record is None:
            raise SandboxServiceError("Sandbox session not found.")
        return record

    @staticmethod
    def validate_path(file_path: str) -> str:
        normalized = posixpath.normpath(file_path)
        if not normalized.startswith(settings.sandbox_root):
            raise SandboxPathError(
                f"Invalid path '{file_path}'. Only absolute paths under {settings.sandbox_root} are allowed."
            )
        return normalized

    async def ensure_parent_dirs(self, session_id: str, file_path: str) -> None:
        record = self.get_record(session_id)
        parent = PurePosixPath(file_path).parent
        if str(parent) in {".", "/"}:
            return

        current = PurePosixPath(settings.sandbox_root)
        for part in parent.parts[len(current.parts) :]:
            current = current / part
            if not await asyncio.to_thread(record.sandbox.files.exists, str(current)):
                await asyncio.to_thread(record.sandbox.files.make_dir, str(current))

    async def write_text_file(self, session_id: str, file_path: str, content: str) -> None:
        normalized = self.validate_path(file_path)
        await self.ensure_parent_dirs(session_id, normalized)
        record = self.get_record(session_id)
        await asyncio.to_thread(record.sandbox.files.write, normalized, content)

    async def read_text_file(self, session_id: str, file_path: str) -> str:
        normalized = self.validate_path(file_path)
        record = self.get_record(session_id)
        try:
            content = await asyncio.to_thread(record.sandbox.files.read, normalized)
        except Exception as exc:  # pragma: no cover - SDK error shape varies
            message = str(exc).lower()
            if "not found" in message or "404" in message:
                raise SandboxFileNotFoundError(f"File not found: {normalized}") from exc
            raise SandboxServiceError(str(exc)) from exc

        if isinstance(content, bytes):
            try:
                return content.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise SandboxServiceError("The requested file is not valid UTF-8 text.") from exc
        return str(content)

    async def get_file_preview(self, session_id: str, file_path: str) -> str:
        return await self.read_text_file(session_id, file_path)

    async def list_tree(self, session_id: str) -> list[FileTreeNode]:
        record = self.get_record(session_id)
        entries = await asyncio.to_thread(record.sandbox.files.list, settings.sandbox_root, 32)
        root = FileTreeNode(path=settings.sandbox_root, name="user", type="directory", children=[])
        node_map: dict[str, FileTreeNode] = {root.path: root}

        for entry in sorted(entries, key=lambda item: item.path):
            if entry.path == settings.sandbox_root:
                continue

            parent_path = str(PurePosixPath(entry.path).parent)
            if parent_path not in node_map:
                continue

            node_type = "directory" if entry.type == FileType.DIR else "file"
            node = FileTreeNode(path=entry.path, name=entry.name, type=node_type, children=[])
            node_map[entry.path] = node
            node_map[parent_path].children.append(node)

        self._sort_tree(root)
        return root.children

    def _sort_tree(self, node: FileTreeNode) -> None:
        node.children.sort(key=lambda item: (item.type != "directory", item.name.lower()))
        for child in node.children:
            self._sort_tree(child)

    @staticmethod
    def with_line_numbers(content: str) -> str:
        if not content:
            return ""
        return "\n".join(f"{index:>4}\t{line}" for index, line in enumerate(content.splitlines(), start=1))

    def session_metadata(self, session_id: str) -> dict[str, Any]:
        record = self.get_record(session_id)
        return {
            "session_id": record.session_id,
            "sandbox_id": record.sandbox_id,
            "template_id": record.template_id,
            "timeout_seconds": record.timeout_seconds,
            "created_at": record.created_at.isoformat(),
        }
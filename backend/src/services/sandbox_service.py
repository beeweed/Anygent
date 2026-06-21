from __future__ import annotations

from typing import Any

from e2b import AsyncSandbox

from src.config.settings import AppSettings
from src.utils.errors import AppError
from src.utils.files import add_line_numbers, build_tree, ensure_text_content, infer_language, validate_sandbox_path


class SandboxService:
    def __init__(self, settings: AppSettings):
        self.settings = settings

    async def ensure_sandbox(self, *, state, api_key: str, template_id: str | None = None) -> Any:
        if state.sandbox is not None:
            return state.sandbox

        sandbox = await AsyncSandbox.create(
            api_key=api_key,
            timeout=self.settings.sandbox_timeout_seconds,
            template=template_id or None,
        )
        state.sandbox = sandbox
        state.sandbox_id = getattr(sandbox, "sandbox_id", None)
        return sandbox

    async def dispose_sandbox(self, state) -> None:
        sandbox = state.sandbox
        if sandbox is None:
            return

        try:
            await sandbox.kill()
        finally:
            state.sandbox = None
            state.sandbox_id = None

    async def get_tree(self, state) -> dict[str, Any]:
        sandbox = self._require_sandbox(state)
        entries = await sandbox.files.list(self.settings.sandbox_root, depth=8)
        serialized = [
            {
                "name": entry.name,
                "path": entry.path,
                "type": getattr(entry.type, "value", None) or str(entry.type or "file"),
            }
            for entry in entries
        ]
        return {
            "root": self.settings.sandbox_root,
            "tree": build_tree(serialized),
        }

    async def read_file(self, state, file_path: str) -> dict[str, str]:
        sandbox = self._require_sandbox(state)
        safe_path = validate_sandbox_path(file_path, self.settings.sandbox_root)
        content = await sandbox.files.read(safe_path)
        text = ensure_text_content(content)
        return {
            "path": safe_path,
            "content": add_line_numbers(text),
            "language": infer_language(safe_path),
        }

    def _require_sandbox(self, state):
        if state.sandbox is None:
            raise AppError("Sandbox is not initialized for this session.", code="sandbox_missing", status_code=400)
        return state.sandbox
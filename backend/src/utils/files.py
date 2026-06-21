from __future__ import annotations

from pathlib import PurePosixPath
from typing import Iterable

from src.utils.errors import AppError


TEXT_EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".txt",
    ".yaml",
    ".yml",
    ".toml",
    ".css",
    ".html",
    ".sh",
    ".env",
    ".ini",
    ".cfg",
    ".sql",
    ".xml",
    ".csv",
  }


def validate_sandbox_path(file_path: str, sandbox_root: str = "/home/user") -> str:
    if not file_path.startswith("/"):
        raise AppError(
            "File path must be absolute.",
            code="invalid_path",
            status_code=400,
            details={"file_path": file_path},
        )

    normalized = str(PurePosixPath(file_path))
    if normalized != sandbox_root and not normalized.startswith(f"{sandbox_root}/"):
        raise AppError(
            "File path must stay inside the sandbox root.",
            code="invalid_path",
            status_code=400,
            details={"file_path": normalized, "sandbox_root": sandbox_root},
        )

    return normalized


def add_line_numbers(content: str) -> str:
    lines = content.splitlines()
    if not lines:
        return "1\t"

    return "\n".join(f"{index}\t{line}" for index, line in enumerate(lines, start=1))


def ensure_text_content(content: str | bytes) -> str:
    if isinstance(content, bytes):
        if b"\x00" in content:
            raise AppError("Binary files are not supported in the preview.", code="binary_file")
        return content.decode("utf-8")

    if "\x00" in content:
        raise AppError("Binary files are not supported in the preview.", code="binary_file")

    return content


def build_tree(paths: Iterable[dict]) -> list[dict]:
    root: dict[str, dict] = {}

    for entry in paths:
        path = entry["path"]
        path_type = entry["type"] or "file"
        parts = [part for part in PurePosixPath(path).parts if part != "/"]
        if not parts:
            continue

        current = root
        current_path = ""
        for index, part in enumerate(parts):
            current_path = f"{current_path}/{part}" if current_path else f"/{part}"
            is_leaf = index == len(parts) - 1
            node_type = path_type if is_leaf else "dir"
            node = current.setdefault(
                current_path,
                {
                    "path": current_path,
                    "name": part,
                    "type": node_type,
                    "children": {},
                },
            )
            if not is_leaf:
                current = node["children"]

    def serialize(nodes: dict[str, dict]) -> list[dict]:
        items = []
        for node in sorted(nodes.values(), key=lambda item: (item["type"] != "dir", item["name"].lower())):
            items.append(
                {
                    "path": node["path"],
                    "name": node["name"],
                    "type": node["type"],
                    "children": serialize(node["children"]),
                }
            )
        return items

    return serialize(root)


def infer_language(file_path: str) -> str:
    suffix = PurePosixPath(file_path).suffix.lower()
    if suffix in TEXT_EXTENSIONS:
        return suffix.lstrip(".") or "text"
    return "text"
from __future__ import annotations

import json

from src.utils.files import validate_sandbox_path


TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "file_write",
        "description": "Create or overwrite a file at the given path inside the sandbox. Use for creating new files or fully rewriting existing ones.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Absolute path starting with /home/user/. Example: /home/user/project/src/App.tsx"
                },
                "content": {
                    "type": "string",
                    "description": "The full content to write to the file."
                }
            },
            "required": ["file_path", "content"]
        }
    }
}


async def execute(*, sandbox, file_path: str, content: str, sandbox_root: str) -> str:
    safe_path = validate_sandbox_path(file_path, sandbox_root)
    await sandbox.files.write(safe_path, content)
    return json.dumps(
        {
            "ok": True,
            "action": "file_write",
            "file_path": safe_path,
            "bytes_written": len(content.encode("utf-8")),
            "message": f"File written successfully: {safe_path}",
        }
    )
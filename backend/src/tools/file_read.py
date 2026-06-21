from __future__ import annotations

import json

from src.utils.errors import AppError
from src.utils.files import add_line_numbers, ensure_text_content, validate_sandbox_path


TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "file_read",
        "description": "Read the content of an existing file from the sandbox. Returns content with line numbers.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Absolute path starting with /home/user/. Example: /home/user/project/src/main.py"
                }
            },
            "required": ["file_path"]
        }
    }
}


async def execute(*, sandbox, file_path: str, sandbox_root: str) -> str:
    safe_path = validate_sandbox_path(file_path, sandbox_root)
    try:
        content = await sandbox.files.read(safe_path)
        numbered = add_line_numbers(ensure_text_content(content))
        return json.dumps(
            {
                "ok": True,
                "action": "file_read",
                "file_path": safe_path,
                "content": numbered,
            }
        )
    except Exception as error:
        message = str(error)
        if isinstance(error, FileNotFoundError) or "not found" in message.lower() or "no such file" in message.lower():
            return json.dumps(
                {
                    "ok": False,
                    "error": {
                        "type": "not_found",
                        "message": f"File does not exist: {safe_path}",
                        "file_path": safe_path,
                    },
                }
            )
        if isinstance(error, AppError):
            raise
        raise
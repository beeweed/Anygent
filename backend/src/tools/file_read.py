from __future__ import annotations

from src.agent.models import ToolExecutionResult
from src.services.sandbox_service import SandboxFileNotFoundError, SandboxService

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


async def file_read(
    *,
    sandbox_service: SandboxService,
    session_id: str,
    file_path: str,
) -> ToolExecutionResult:
    try:
        content = await sandbox_service.read_text_file(session_id, file_path)
    except SandboxFileNotFoundError as exc:
        return ToolExecutionResult(content=str(exc), is_error=True)

    return ToolExecutionResult(
        content=sandbox_service.with_line_numbers(content),
        touched_paths=[file_path],
    )
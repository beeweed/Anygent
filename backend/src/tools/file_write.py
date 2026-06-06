from __future__ import annotations

from src.agent.models import ToolExecutionResult
from src.services.sandbox_service import SandboxService

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


async def file_write(
    *,
    sandbox_service: SandboxService,
    session_id: str,
    file_path: str,
    content: str,
) -> ToolExecutionResult:
    await sandbox_service.write_text_file(session_id, file_path, content)
    return ToolExecutionResult(
        content=f"Created or overwritten file successfully: {file_path}",
        touched_paths=[file_path],
    )
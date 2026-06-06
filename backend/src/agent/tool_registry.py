from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from src.agent.models import ToolExecutionResult
from src.services.sandbox_service import SandboxService
from src.tools.file_read import TOOL_SCHEMA as FILE_READ_SCHEMA
from src.tools.file_read import file_read
from src.tools.file_write import TOOL_SCHEMA as FILE_WRITE_SCHEMA
from src.tools.file_write import file_write


@dataclass(slots=True)
class AgentRunContext:
    session_id: str
    sandbox_service: SandboxService


class ToolRegistry:
    def __init__(self) -> None:
        self._tools = {
            "file_write": file_write,
            "file_read": file_read,
        }
        self._schemas = [FILE_WRITE_SCHEMA, FILE_READ_SCHEMA]

    def list_tools(self) -> list[dict[str, Any]]:
        return self._schemas

    async def execute(
        self,
        *,
        name: str,
        arguments: dict[str, Any],
        context: AgentRunContext,
    ) -> ToolExecutionResult:
        tool = self._tools.get(name)
        if tool is None:
            return ToolExecutionResult(content=f"Unknown tool: {name}", is_error=True)

        try:
            return await tool(
                sandbox_service=context.sandbox_service,
                session_id=context.session_id,
                **arguments,
            )
        except Exception as exc:  # pragma: no cover - defensive runtime guard
            return ToolExecutionResult(content=str(exc), is_error=True)
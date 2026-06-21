from __future__ import annotations

from src.tools import file_read, file_write
from src.utils.errors import AppError


class ToolRegistry:
    def __init__(self, sandbox_root: str):
        self.sandbox_root = sandbox_root
        self._tools = {
            "file_write": file_write.execute,
            "file_read": file_read.execute,
        }
        self.schemas = [file_write.TOOL_SCHEMA, file_read.TOOL_SCHEMA]

    async def execute(self, tool_name: str, sandbox, arguments: dict) -> str:
        tool = self._tools.get(tool_name)
        if tool is None:
            raise AppError(f"Unknown tool: {tool_name}", code="unknown_tool", status_code=400)
        return await tool(sandbox=sandbox, sandbox_root=self.sandbox_root, **arguments)
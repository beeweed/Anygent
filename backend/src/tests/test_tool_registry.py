from __future__ import annotations

import pytest

from src.agent.tool_registry import AgentRunContext, ToolRegistry
from src.services.sandbox_service import SandboxFileNotFoundError


class FakeSandboxService:
    def __init__(self) -> None:
        self.files: dict[str, str] = {}

    async def write_text_file(self, session_id: str, file_path: str, content: str) -> None:
        self.files[file_path] = content

    async def read_text_file(self, session_id: str, file_path: str) -> str:
        if file_path not in self.files:
            raise SandboxFileNotFoundError(f"File not found: {file_path}")
        return self.files[file_path]

    @staticmethod
    def with_line_numbers(content: str) -> str:
        return "\n".join(f"{index:>4}\t{line}" for index, line in enumerate(content.splitlines(), start=1))


@pytest.mark.asyncio
async def test_tool_registry_dispatches_known_tools() -> None:
    registry = ToolRegistry()
    sandbox_service = FakeSandboxService()
    context = AgentRunContext(session_id="session-1", sandbox_service=sandbox_service)

    write_result = await registry.execute(
        name="file_write",
        arguments={"file_path": "/home/user/demo.txt", "content": "demo"},
        context=context,
    )
    read_result = await registry.execute(
        name="file_read",
        arguments={"file_path": "/home/user/demo.txt"},
        context=context,
    )

    assert write_result.is_error is False
    assert read_result.content == "   1\tdemo"


@pytest.mark.asyncio
async def test_tool_registry_returns_error_for_unknown_tool() -> None:
    registry = ToolRegistry()
    context = AgentRunContext(session_id="session-1", sandbox_service=FakeSandboxService())

    result = await registry.execute(name="unknown", arguments={}, context=context)

    assert result.is_error is True
    assert result.content == "Unknown tool: unknown"
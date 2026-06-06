from __future__ import annotations

import pytest

from src.tools.file_read import file_read
from src.tools.file_write import file_write
from src.services.sandbox_service import SandboxFileNotFoundError


class FakeSandboxService:
    def __init__(self) -> None:
        self.writes: list[tuple[str, str, str]] = []
        self.files: dict[str, str] = {}

    async def write_text_file(self, session_id: str, file_path: str, content: str) -> None:
        self.writes.append((session_id, file_path, content))
        self.files[file_path] = content

    async def read_text_file(self, session_id: str, file_path: str) -> str:
        if file_path not in self.files:
            raise SandboxFileNotFoundError(f"File not found: {file_path}")
        return self.files[file_path]

    @staticmethod
    def with_line_numbers(content: str) -> str:
        return "\n".join(f"{index:>4}\t{line}" for index, line in enumerate(content.splitlines(), start=1))


@pytest.mark.asyncio
async def test_file_write_returns_touched_path() -> None:
    sandbox_service = FakeSandboxService()

    result = await file_write(
        sandbox_service=sandbox_service,
        session_id="session-1",
        file_path="/home/user/project/app.py",
        content="print('hi')",
    )

    assert result.is_error is False
    assert result.touched_paths == ["/home/user/project/app.py"]
    assert sandbox_service.writes[0][2] == "print('hi')"


@pytest.mark.asyncio
async def test_file_read_returns_numbered_content() -> None:
    sandbox_service = FakeSandboxService()
    sandbox_service.files["/home/user/project/app.py"] = "one\ntwo"

    result = await file_read(
        sandbox_service=sandbox_service,
        session_id="session-1",
        file_path="/home/user/project/app.py",
    )

    assert result.is_error is False
    assert result.content == "   1\tone\n   2\ttwo"


@pytest.mark.asyncio
async def test_file_read_returns_structured_error_for_missing_file() -> None:
    sandbox_service = FakeSandboxService()

    result = await file_read(
        sandbox_service=sandbox_service,
        session_id="session-1",
        file_path="/home/user/project/missing.py",
    )

    assert result.is_error is True
    assert "missing.py" in result.content
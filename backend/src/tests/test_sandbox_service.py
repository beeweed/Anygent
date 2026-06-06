from __future__ import annotations

import pytest

from src.services.sandbox_service import SandboxPathError, SandboxService


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        ("/home/user/project/main.py", "/home/user/project/main.py"),
        ("/home/user/../user/project/app.py", "/home/user/project/app.py"),
    ],
)
def test_validate_path_accepts_home_user(path: str, expected: str) -> None:
    assert SandboxService.validate_path(path) == expected


@pytest.mark.parametrize("path", ["relative.txt", "/tmp/file.txt", "/home/other/app.py"])
def test_validate_path_rejects_invalid_targets(path: str) -> None:
    with pytest.raises(SandboxPathError):
        SandboxService.validate_path(path)


def test_with_line_numbers_formats_all_lines() -> None:
    content = "alpha\nbeta\ngamma"
    assert SandboxService.with_line_numbers(content) == "   1\talpha\n   2\tbeta\n   3\tgamma"
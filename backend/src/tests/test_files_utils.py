import pytest

from src.utils.errors import AppError
from src.utils.files import add_line_numbers, build_tree, validate_sandbox_path


def test_validate_sandbox_path_accepts_valid_paths():
    assert validate_sandbox_path('/home/user/project/main.py') == '/home/user/project/main.py'


@pytest.mark.parametrize('invalid_path', ['relative.txt', '/etc/passwd', '/home/user2/test'])
def test_validate_sandbox_path_rejects_invalid_paths(invalid_path):
    with pytest.raises(AppError):
        validate_sandbox_path(invalid_path)


def test_add_line_numbers_numbers_all_lines():
    assert add_line_numbers('a\nb') == '1\ta\n2\tb'


def test_build_tree_creates_nested_hierarchy():
    tree = build_tree([
        {'path': '/home/user/project', 'type': 'dir'},
        {'path': '/home/user/project/src', 'type': 'dir'},
        {'path': '/home/user/project/src/main.py', 'type': 'file'},
    ])
    assert tree[0]['name'] == 'home'
    assert tree[0]['children'][0]['name'] == 'user'
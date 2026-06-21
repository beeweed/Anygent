import json
import pytest

from src.tools.registry import ToolRegistry


class FakeFiles:
    def __init__(self):
        self.storage = {}

    async def write(self, path, content):
        self.storage[path] = content

    async def read(self, path):
        if path not in self.storage:
            raise FileNotFoundError(path)
        return self.storage[path]


class FakeSandbox:
    def __init__(self):
        self.files = FakeFiles()


@pytest.mark.asyncio
async def test_tool_registry_writes_and_reads_files():
    registry = ToolRegistry('/home/user')
    sandbox = FakeSandbox()

    write_result = await registry.execute(
        'file_write',
        sandbox,
        {'file_path': '/home/user/project/app.py', 'content': 'print(1)'},
    )
    read_result = await registry.execute(
        'file_read',
        sandbox,
        {'file_path': '/home/user/project/app.py'},
    )

    assert json.loads(write_result)['ok'] is True
    assert '1\tprint(1)' in json.loads(read_result)['content']


@pytest.mark.asyncio
async def test_file_read_returns_structured_not_found_error():
    registry = ToolRegistry('/home/user')
    sandbox = FakeSandbox()

    result = await registry.execute('file_read', sandbox, {'file_path': '/home/user/missing.py'})
    payload = json.loads(result)

    assert payload['ok'] is False
    assert payload['error']['type'] == 'not_found'
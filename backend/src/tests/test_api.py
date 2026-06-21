import json

from fastapi.testclient import TestClient

import src.main as main


def test_health_endpoint():
    client = TestClient(main.app)
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'healthy'


def test_provider_list_endpoint():
    client = TestClient(main.app)
    response = client.get('/api/providers')
    assert response.status_code == 200
    assert len(response.json()['providers']) == 2


def test_chat_stream_uses_agent_stream(monkeypatch):
    async def fake_stream(_request):
        yield 'event: token\ndata: {"message_id":"1","token":"hi"}\n\n'
        yield 'event: complete\ndata: {"message_id":"1","content":"hi","session_id":"abc"}\n\n'

    monkeypatch.setattr(main.agent, 'stream_chat', fake_stream)

    client = TestClient(main.app)
    response = client.post(
        '/api/chat/stream',
        json={
            'message': 'hello',
            'provider': 'openrouter',
            'model': 'demo-model',
            'openrouter_api_key': 'test',
            'e2b_api_key': 'test',
        },
    )

    assert response.status_code == 200
    assert 'event: token' in response.text
    assert 'event: complete' in response.text
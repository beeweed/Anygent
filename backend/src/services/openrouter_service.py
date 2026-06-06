from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from src.agent.models import OpenRouterModelOption
from src.config.settings import settings


class OpenRouterService:
    def __init__(self) -> None:
        self._base_url = settings.openrouter_base_url.rstrip("/")
        self._timeout = httpx.Timeout(settings.request_timeout_seconds, connect=30.0)

    @staticmethod
    def _headers(api_key: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://sandbox-agent-studio.local",
            "X-OpenRouter-Title": "Sandbox Agent Studio",
        }

    async def fetch_models(self, api_key: str) -> list[OpenRouterModelOption]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(
                f"{self._base_url}/models",
                headers=self._headers(api_key),
            )
            response.raise_for_status()
            payload = response.json()

        options: list[OpenRouterModelOption] = []
        for item in payload.get("data", []):
            options.append(
                OpenRouterModelOption(
                    id=item.get("id", ""),
                    name=item.get("name") or item.get("id", "Unknown model"),
                    description=item.get("description") or "",
                    context_length=item.get("context_length"),
                    pricing=item.get("pricing") or {},
                    supported_parameters=item.get("supported_parameters") or [],
                    architecture=item.get("architecture") or {},
                )
            )

        options.sort(key=lambda option: (option.name.lower(), option.id.lower()))
        return options

    async def stream_chat_completion(
        self,
        *,
        api_key: str,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> AsyncGenerator[dict[str, Any], None]:
        payload = {
            "model": model,
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
            "parallel_tool_calls": False,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/chat/completions",
                headers=self._headers(api_key),
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue

                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        continue

                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        continue
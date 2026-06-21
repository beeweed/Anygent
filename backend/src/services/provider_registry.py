from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Literal

import httpx

from src.agent.models import ProviderDefinition, ProviderModel
from src.config.settings import AppSettings
from src.utils.errors import AppError

ProviderId = Literal["openrouter", "nvidia"]


class ProviderRegistry:
    def __init__(self, settings: AppSettings):
        self.settings = settings
        self.providers = [
            ProviderDefinition(
                id="openrouter",
                name="OpenRouter",
                requires_base_url=False,
                key_label="OpenRouter API Key",
                model_source_label="OpenRouter models API",
            ),
            ProviderDefinition(
                id="nvidia",
                name="NVIDIA NIM",
                requires_base_url=True,
                key_label="NVIDIA API Key",
                model_source_label="NVIDIA OpenAI-compatible models API",
            ),
        ]

    def list_providers(self) -> list[ProviderDefinition]:
        return self.providers

    def get_api_key(self, provider: ProviderId, payload: dict[str, Any]) -> str:
        if provider == "openrouter":
            key = payload.get("openrouter_api_key")
        else:
            key = payload.get("nvidia_api_key")

        if not key:
            raise AppError(
                f"Missing API key for provider '{provider}'.",
                code="missing_provider_key",
                status_code=400,
            )

        return key

    def build_base_url(self, provider: ProviderId, base_url: str | None = None) -> str:
        if provider == "openrouter":
            return "https://openrouter.ai/api/v1"

        resolved = (base_url or self.settings.default_nvidia_base_url).rstrip("/")
        if not resolved:
            raise AppError("NVIDIA base URL is required.", code="missing_nvidia_base_url", status_code=400)
        return resolved if resolved.endswith("/v1") else f"{resolved}/v1"

    def build_headers(self, provider: ProviderId, api_key: str) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        if provider == "openrouter":
            headers["HTTP-Referer"] = self.settings.openrouter_site_url
            headers["X-OpenRouter-Title"] = self.settings.openrouter_site_name
        return headers

    async def fetch_models(self, provider: ProviderId, api_key: str, base_url: str | None = None) -> list[ProviderModel]:
        url = f"{self.build_base_url(provider, base_url)}/models"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.build_headers(provider, api_key))

        if response.status_code >= 400:
            raise AppError(
                "Failed to fetch models from provider.",
                code="models_fetch_failed",
                status_code=response.status_code,
                details=response.text,
            )

        payload = response.json()
        items = payload.get("data", []) if isinstance(payload, dict) else []
        if provider == "openrouter":
            return [self._map_openrouter_model(item) for item in items]
        return [self._map_nvidia_model(item) for item in items]

    async def stream_chat_completion(
        self,
        *,
        provider: ProviderId,
        api_key: str,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        base_url: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.1,
    ) -> AsyncGenerator[str, None]:
        url = f"{self.build_base_url(provider, base_url)}/chat/completions"
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
            "tools": tools,
            "tool_choice": "auto",
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, headers=self.build_headers(provider, api_key), json=payload) as response:
                if response.status_code >= 400:
                    error_body = await response.aread()
                    raise AppError(
                        "Provider chat completion request failed.",
                        code="provider_request_failed",
                        status_code=response.status_code,
                        details=error_body.decode("utf-8", errors="ignore"),
                    )

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith(":"):
                        continue
                    if not line.startswith("data:"):
                        continue

                    payload_line = line[5:].strip()
                    if not payload_line:
                        continue

                    yield payload_line

    @staticmethod
    def _map_openrouter_model(item: dict[str, Any]) -> ProviderModel:
        supported_parameters = item.get("supported_parameters") or []
        return ProviderModel(
            id=item["id"],
            name=item.get("name") or item["id"],
            provider="openrouter",
            description=item.get("description"),
            context_length=item.get("context_length"),
            supports_tools="tools" in supported_parameters,
            metadata={
                "pricing": item.get("pricing"),
                "top_provider": item.get("top_provider"),
                "architecture": item.get("architecture"),
            },
        )

    @staticmethod
    def _map_nvidia_model(item: dict[str, Any]) -> ProviderModel:
        model_id = item.get("id") or item.get("model")
        if not model_id:
            raise AppError("Invalid NVIDIA model payload.", code="invalid_model_payload")

        return ProviderModel(
            id=model_id,
            name=item.get("name") or model_id,
            provider="nvidia",
            description=json.dumps(item.get("owned_by") or item.get("description") or ""),
            context_length=None,
            supports_tools=True,
            metadata=item,
        )
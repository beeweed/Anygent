from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", extra="ignore")

    app_name: str = "Sandbox Agent Studio"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    request_timeout_seconds: float = 120.0
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])
    max_iterations: int = 1000
    sandbox_timeout_seconds: int = 3600
    sandbox_root: str = "/home/user"


settings = Settings()
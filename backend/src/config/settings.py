from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    app_name: str = "AI Sandbox Agent"
    api_prefix: str = "/api"
    cors_origins: list[str] = ["*"]
    request_timeout_seconds: float = 120.0
    sandbox_timeout_seconds: int = 3600
    sandbox_root: str = "/home/user"
    openrouter_site_url: str = "http://localhost"
    openrouter_site_name: str = "AI Sandbox Agent"
    default_nvidia_base_url: str = "https://integrate.api.nvidia.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    return AppSettings()
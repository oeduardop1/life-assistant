from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:54322/postgres"

    # Auth
    SERVICE_SECRET: str = "dev-secret-change-me"

    # LLM
    LLM_PROVIDER: str = "gemini"
    LLM_MODEL: str = "gemini-flash-latest"
    TRIAGE_LLM_MODEL: str = "gemini-flash-latest"
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # App
    APP_VERSION: str = "0.1.0"
    LOG_LEVEL: str = Field(default="info")

    # Consolidation (APScheduler)
    CONSOLIDATION_ENABLED: bool = True
    CONSOLIDATION_CRON_HOUR: int = 3
    CONSOLIDATION_CRON_MINUTE: int = 0


@lru_cache
def get_settings() -> Settings:
    return Settings()

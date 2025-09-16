from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    telegram_token: str = Field(..., alias="TELEGRAM_TOKEN")
    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")
    gemini_model: str = Field("gemini-2.5-flash", alias="GEMINI_MODEL")
    db_path: Path = Field(Path("./gryag.db"), alias="DB_PATH")
    max_turns: int = Field(50, alias="MAX_TURNS", ge=1)
    per_user_per_hour: int = Field(5, alias="PER_USER_PER_HOUR", ge=1)
    use_redis: bool = Field(False, alias="USE_REDIS")
    redis_url: str | None = Field("redis://localhost:6379/0", alias="REDIS_URL")

    @property
    def db_path_str(self) -> str:
        return str(self.db_path)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()

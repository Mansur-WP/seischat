"""Environment-driven settings for the SeisChat backend."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env."""

    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/seischat"
    )
    app_environment: str = "development"
    frontend_origin: str = "http://localhost:5173"
    session_cookie_name: str = "seischat_session"
    csrf_cookie_name: str = "seischat_csrf"
    session_ttl_minutes: int = 60
    csrf_secure: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return one cached settings object for the application process."""

    return Settings()

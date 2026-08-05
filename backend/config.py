import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Required values — populated from .env / environment variables.
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # In production this MUST be set. For local dev a fallback is provided.
    SECRET_KEY: str = "change-me-in-production-please"

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def is_production(self) -> bool:
        return os.getenv("ENV", "development").lower() in {"prod", "production"}


settings = Settings()

if settings.is_production() and (
    not settings.SECRET_KEY
    or settings.SECRET_KEY.startswith("change-me")
    or settings.SECRET_KEY == "your-secret-key-change-in-production"
):
    raise RuntimeError(
        "SECRET_KEY must be set to a strong, unique value in production. "
        "Set the SECRET_KEY environment variable."
    )

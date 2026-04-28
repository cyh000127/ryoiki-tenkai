from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "local"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "postgresql+psycopg://app:app@localhost:5432/gesture_skill"
    game_state_storage_backend: str = "sql"
    cors_allowed_origins: str = "http://localhost:5173"
    min_gesture_confidence: float = 0.65


@lru_cache
def get_settings() -> Settings:
    return Settings()

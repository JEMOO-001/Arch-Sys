from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ARCHIVE_ROOT_PATH: str
    GEMINI_API_KEY: Optional[str] = None
    LM_STUDIO_BASE_URL: str = "http://localhost:1234/v1"
    LM_STUDIO_MODEL: str = "qwen3.5-4b-uncensored-hauhaucs-aggressive"
    UPLOAD_DIR: str = "static/uploads"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:4173,http://localhost:2500"

    @field_validator("SECRET_KEY")
    @classmethod
    def _validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters long. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

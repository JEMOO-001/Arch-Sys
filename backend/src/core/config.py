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
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:4173,http://localhost:2500,http://172.20.0.149:2500,http://172.20.0.149:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()


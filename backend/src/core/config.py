from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ARCHIVE_ROOT_PATH: str
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:4173"
    MAX_PREVIEW_SIZE_MB: int = 50
    MAX_DOWNLOAD_SIZE_MB: int = 500
    MAX_AUDIT_BATCH_SIZE: int = 500

    class Config:
        env_file = ".env"

settings = Settings()

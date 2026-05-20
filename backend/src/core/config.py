from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ARCHIVE_ROOT_PATH: str
    UPLOAD_DIR: str = "static/uploads"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:4173,http://localhost:2500"

    class Config:
        env_file = ".env"

settings = Settings()

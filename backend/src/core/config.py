from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ARCHIVE_ROOT_PATH: str
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:4173"

    class Config:
        env_file = ".env"

settings = Settings()

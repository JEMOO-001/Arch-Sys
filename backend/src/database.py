from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from .core.config import settings


def _build_async_url(database_url: str) -> str:
    """
    Convert a pyodbc URL to aioodbc and apply safe TLS defaults.

    TrustServerCertificate is NOT injected silently — declare it explicitly
    in DATABASE_URL when your server uses a self-signed cert.
    Default transport is encrypted (Encrypt=yes).
    """
    url = database_url.replace("mssql+pyodbc://", "mssql+aioodbc://", 1)
    lower_url = url.lower()
    params = []

    if "encrypt=" not in lower_url:
        params.append("Encrypt=yes")   # safe default: always encrypt transport

    if params:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}{'&'.join(params)}"

    return url


async_db_url = _build_async_url(settings.DATABASE_URL)

engine = create_async_engine(
    async_db_url,
    echo=False,
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from .core.config import settings

def _build_async_url(database_url: str) -> str:
    url = database_url.replace("mssql+pyodbc://", "mssql+aioodbc://", 1)
    lower_url = url.lower()
    params = []

    if "trustservercertificate=" not in lower_url:
        params.append("TrustServerCertificate=yes")
    if "encrypt=" not in lower_url:
        params.append("Encrypt=no")

    if params:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}{'&'.join(params)}"

    return url


async_db_url = _build_async_url(settings.DATABASE_URL)

engine = create_async_engine(
    async_db_url,
    echo=False,
    poolclass=NullPool,
    pool_pre_ping=True,
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

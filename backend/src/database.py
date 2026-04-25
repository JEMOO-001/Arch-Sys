from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from .core.config import settings

# For SQL Server with async, we use aioodbc or similar
# The connection string needs to be adjusted for async if using SQLAlchemy async
# DATABASE_URL=mssql+pyodbc://jimmy:x001@172.20.70.75/GIS_Archiving?driver=ODBC+Driver+17+for+SQL+Server
# For async, we often need a different driver or a wrapper.
# Since we are using standard pyodbc in the .env, I will wrap it for async or use synchronous for now if needed.
# However, to be modern, let's assume we use the async pattern.

engine = create_async_engine(
    settings.DATABASE_URL.replace("pyodbc", "aioodbc"),
    echo=True,
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

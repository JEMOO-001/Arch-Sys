from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

async def generate_unique_id(db: AsyncSession, prefix: str) -> str:
    """
    Generates a unique ID in the format 'XX-NNNN'.
    Uses a SQL Sequence for thread-safe incrementing.
    """
    # 1. Get next value from sequence
    result = await db.execute(text("SELECT NEXT VALUE FOR LayoutIDSequence"))
    next_val = result.scalar()
    
    # 2. Format as 4-digit string with prefix
    # e.g., 'AB' + '0042' -> 'AB-0042'
    unique_id = f"{prefix}-{next_val:04d}"
    
    return unique_id

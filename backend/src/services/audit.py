from sqlalchemy.ext.asyncio import AsyncSession
from ..models.maps import AuditLog

async def log_change(
    db: AsyncSession,
    map_id: int,
    user_id: int,
    field_name: str,
    old_value: str,
    new_value: str
):
    """
    Records a metadata change in the Audit_Log table.
    """
    audit_entry = AuditLog(
        map_id=map_id,
        changed_by=user_id,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None
    )
    db.add(audit_entry)
    # We don't commit here; we assume the caller will commit as part of the transaction
    return audit_entry

async def log_multiple_changes(
    db: AsyncSession,
    map_id: int,
    user_id: int,
    changes: dict # {field_name: (old_val, new_val)}
):
    """
    Convenience method to log multiple changes at once.
    """
    for field, (old_val, new_val) in changes.items():
        if old_val != new_val:
            await log_change(db, map_id, user_id, field, old_val, new_val)

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone
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
        new_value=str(new_value) if new_value is not None else None,
        changed_at=datetime.now(timezone.utc) + timedelta(hours=3)
    )
    db.add(audit_entry)
    return audit_entry

async def log_multiple_changes(
    db: AsyncSession,
    map_id: int,
    user_id: int,
    changes: dict # {field_name: (old_val, new_val)}
):
    """
    Convenience method to log multiple changes at once.
    Logs ALL changes, even if same value (to track user actions).
    """
    for field, (old_val, new_val) in changes.items():
        await log_change(db, map_id, user_id, field, old_val, new_val)

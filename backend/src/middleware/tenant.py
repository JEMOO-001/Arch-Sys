from fastapi import Request, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.base import User

async def get_tenant_id(request: Request) -> int:
    """Extract tenant_id from JWT token. Default to 1 for single-tenant mode."""
    # In multi-tenant mode, extract from JWT or subdomain
    # For now, return default tenant
    return 1

class TenantMiddleware:
    async def __call__(self, request: Request, call_next):
        # Add tenant_id to request state for use in endpoints
        request.state.tenant_id = 1
        response = await call_next(request)
        return response
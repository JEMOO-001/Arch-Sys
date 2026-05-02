from fastapi import Request

async def get_tenant_id(request: Request) -> int:
    """Extract tenant_id from JWT token. Default to 1 for single-tenant mode."""
    return 1

async def tenant_middleware(request: Request, call_next):
    """Add tenant_id to request state for use in endpoints."""
    request.state.tenant_id = 1
    response = await call_next(request)
    return response
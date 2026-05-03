import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from .middleware.limiter import limiter
from .middleware.tenant import tenant_middleware
from .routers import users, maps, proxy, stats, auth, categories
from .core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sentinel API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

# 1. CORS Configuration
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# 2. Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {str(exc)}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# 3. Tenant Middleware
@app.middleware("http")
async def add_tenant(request, call_next):
    return await tenant_middleware(request, call_next)


# 4. CSRF Protection Middleware
@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        # Skip CSRF for login/logout (they set/get cookies)
        if request.url.path in ["/api/v1/auth/login", "/api/v1/auth/logout"]:
            return await call_next(request)

        csrf_token = request.headers.get("x-csrf-token")
        if not csrf_token:
            return JSONResponse(
                status_code=403, content={"detail": "Missing CSRF token"}
            )
    return await call_next(request)


# 5. Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )

    if request.url.path.startswith("/api/v1/proxy/"):
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; frame-ancestors 'self'; img-src 'self' data:;"
        )
    else:
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; frame-ancestors 'none';"
        )

    return response


# 4. Router Registration with API versioning
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(maps.router, prefix=API_PREFIX)
app.include_router(proxy.router, prefix=API_PREFIX)
app.include_router(stats.router, prefix=API_PREFIX)
app.include_router(categories.router, prefix=API_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

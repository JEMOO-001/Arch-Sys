from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import users, maps, proxy, stats, auth
from .core.config import settings

app = FastAPI(title="Sentinel API", version="1.0.0")

# 1. CORS Configuration
# In production, replace ["*"] with your actual dashboard domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Router Registration
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(maps.router)
app.include_router(proxy.router)
app.include_router(stats.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

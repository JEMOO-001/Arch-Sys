import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from src.main import app
from src.database import get_db, Base
from src.models.base import User
from src.dependencies.auth import get_password_hash

# Test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def test_user():
    async with TestSessionLocal() as session:
        user = User(
            username="testuser",
            password_hash=get_password_hash("testpass"),
            full_name="Test User",
            role="analyst",
            tenant_id=1
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

class TestAuth:
    def test_login_success(self, client, test_user):
        response = client.post("/api/v1/auth/login", data={
            "username": "testuser",
            "password": "testpass"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client):
        response = client.post("/api/v1/auth/login", data={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401

    def test_login_rate_limiting(self, client):
        # Make 6 requests in quick succession
        for i in range(6):
            response = client.post("/api/v1/auth/login", data={
                "username": "testuser",
                "password": "wrongpass"
            })
        # The 6th request should be rate limited
        assert response.status_code == 429

class TestSecurityHeaders:
    def test_security_headers_present(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert "Content-Security-Policy" in response.headers

class TestJWTClaims:
    def test_jwt_contains_required_claims(self, client, test_user):
        response = client.post("/api/v1/auth/login", data={
            "username": "testuser",
            "password": "testpass"
        })
        data = response.json()
        token = data["access_token"]
        
        # Decode without verification to check claims
        import jwt
        payload = jwt.decode(token, options={"verify_signature": False})
        
        assert "iat" in payload
        assert "jti" in payload
        assert payload["type"] == "access"
        assert payload["sub"] == "testuser"
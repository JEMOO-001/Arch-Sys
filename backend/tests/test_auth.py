import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

class TestAuth:
    def test_login_invalid_credentials(self):
        response = client.post("/api/v1/auth/login", data={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401

class TestSecurityHeaders:
    def test_security_headers_present(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert "Content-Security-Policy" in response.headers
        assert "Strict-Transport-Security" in response.headers

class TestAPIVersioning:
    def test_api_v1_prefix_exists(self):
        response = client.get("/api/v1/auth/login")
        # Should be 405 (GET not allowed) or 422, but not 404
        assert response.status_code != 404

class TestPasswordValidation:
    def test_password_too_short(self):
        from src.schemas.auth import UserCreate
        with pytest.raises(ValueError):
            UserCreate(
                username="testuser",
                full_name="Test User",
                role="analyst",
                password="short"
            )
    
    def test_password_no_uppercase(self):
        from src.schemas.auth import UserCreate
        with pytest.raises(ValueError):
            UserCreate(
                username="testuser",
                full_name="Test User",
                role="analyst",
                password="lowercase123!"
            )
    
    def test_password_valid(self):
        from src.schemas.auth import UserCreate
        user = UserCreate(
            username="testuser",
            full_name="Test User",
            role="analyst",
            password="ValidPass123!"
        )
        assert user.password == "ValidPass123!"
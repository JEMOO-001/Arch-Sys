import pytest
from src.schemas.auth import UserCreate

class TestPasswordValidation:
    def test_password_too_short(self):
        with pytest.raises(ValueError):
            UserCreate(
                username="testuser",
                full_name="Test User",
                role="analyst",
                password="short"
            )
    
    def test_password_no_uppercase(self):
        with pytest.raises(ValueError):
            UserCreate(
                username="testuser",
                full_name="Test User",
                role="analyst",
                password="lowercase123!"
            )
    
    def test_password_no_special_char(self):
        with pytest.raises(ValueError):
            UserCreate(
                username="testuser",
                full_name="Test User",
                role="analyst",
                password="Password123"
            )
    
    def test_password_valid(self):
        user = UserCreate(
            username="testuser",
            full_name="Test User",
            role="analyst",
            password="ValidPass123!"
        )
        assert user.password == "ValidPass123!"

class TestSchemaValidation:
    def test_username_too_short(self):
        with pytest.raises(ValueError):
            UserCreate(
                username="ab",
                full_name="Test User",
                role="analyst",
                password="ValidPass123!"
            )
    
    def test_invalid_role(self):
        with pytest.raises(ValueError):
            UserCreate(
                username="testuser",
                full_name="Test User",
                role="superadmin",
                password="ValidPass123!"
            )
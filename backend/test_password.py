"""
Test script to verify password hashing and login works correctly.
Run this after starting the backend to create a test user and verify login.
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def create_user_direct_sql():
    """Generate SQL to insert a test user with properly hashed password"""
    from dependencies.auth import get_password_hash

    # Hash the password
    password_hash = get_password_hash("test123")

    sql = f"""
USE GIS_Archiving;

-- Insert test user if not exists
IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'testuser')
BEGIN
    INSERT INTO Users (username, password_hash, full_name, role)
    VALUES ('testuser', '{password_hash}', 'Test User', 'analyst');
    PRINT 'Test user created successfully';
END
ELSE
BEGIN
    UPDATE Users SET password_hash = '{password_hash}' WHERE username = 'testuser';
    PRINT 'Test user password updated';
END

-- Verify
SELECT * FROM Users WHERE username = 'testuser';
"""
    return sql

def test_login():
    """Test login endpoint"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "testuser", "password": "test123"}
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"✅ Login successful! Token: {token[:30]}...")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_next_id(token):
    """Test the next-id endpoint"""
    try:
        response = requests.get(
            f"{BASE_URL}/maps/next-id",
            params={"prefix": "GN"},
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            print(f"✅ Next ID: {response.json()}")
        else:
            print(f"❌ Next ID failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("Sentinel Backend Test")
    print("=" * 50)

    # Generate SQL for creating user
    print("\n📋 SQL to create test user:")
    print("-" * 50)
    try:
        # Try importing to generate SQL
        import sys
        sys.path.insert(0, 'src')
        from dependencies.auth import get_password_hash
        password_hash = get_password_hash("test123")
        print(f"USE GIS_Archiving;")
        print(f"INSERT INTO Users (username, password_hash, full_name, role)")
        print(f"VALUES ('testuser', '{password_hash}', 'Test User', 'analyst');")
    except Exception as e:
        print(f"Could not generate SQL: {e}")
        print("Please run this from the backend directory with venv activated")

    print("-" * 50)

    # Test API
    print("\n🧪 Testing API endpoints...")
    token = test_login()
    if token:
        test_next_id(token)

    print("\n" + "=" * 50)

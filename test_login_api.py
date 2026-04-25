import requests
import sys

def test_login(base_url, username, password):
    print(f"Testing login at {base_url}/auth/login")
    print(f"Username: {username}")
    
    try:
        # Use form data as the C# code does
        data = {
            "username": username,
            "password": password
        }
        
        response = requests.post(f"{base_url}/auth/login", data=data, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            json_data = response.json()
            token = json_data.get("access_token")
            if token:
                print("SUCCESS: Login successful!")
                print(f"Access Token (first 20 chars): {token[:20]}...")
                return True
            else:
                print("FAILURE: Login successful but no access_token found in response.")
                print(f"Response: {json_data}")
        else:
            print(f"FAILURE: Login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Connection failed: {e}")
    
    return False

if __name__ == "__main__":
    url = "http://localhost:8000"
    user = "admin"
    pwd = "password123" # Default from your setup?
    
    if len(sys.argv) > 1:
        user = sys.argv[1]
    if len(sys.argv) > 2:
        pwd = sys.argv[2]
        
    test_login(url, user, pwd)

import requests
import json

def test_login(email, password):
    url = "http://127.0.0.1:8000/api/v1/auth/login"
    payload = {
        "email": email,
        "password": password
    }
    try:
        response = requests.post(url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login("balanbalraj@gmail.com", "Welcome@123")

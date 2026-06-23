import urllib.request
import json
import sys

def test_login():
    url = "http://localhost:8000/api/v1/auth/login"
    data = {"email": "admin@synergyglobal.in", "password": "Welcome@123"}
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            print(f"Status Code: {response.status}")
            print(f"Response: {body}")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"HTTPError Status Code: {e.code}")
        print(f"Error Response: {body}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()

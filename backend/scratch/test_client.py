import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user

# Mock auth
app.dependency_overrides[get_current_user] = lambda: {"id": "123", "role": "admin"}

client = TestClient(app)

def check():
    # Hit the endpoint
    res = client.get("/api/v1/trainings/")
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    
    res2 = client.get("/api/v1/trainings/?department_id=")
    print(f"Status Code with empty string: {res2.status_code}")

if __name__ == "__main__":
    check()

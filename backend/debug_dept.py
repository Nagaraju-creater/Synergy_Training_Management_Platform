from fastapi.testclient import TestClient
import app.models.registry
from app.main import app
from app.auth.service import AuthService
from app.database import AsyncSessionLocal
from app.users.models import User
from sqlalchemy import select
import asyncio

client = TestClient(app)

async def get_token():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).limit(1))).scalar_one_or_none()
        return AuthService.create_tokens(str(user.id), "admin").access_token

token = asyncio.run(get_token())
headers = {"Authorization": f"Bearer {token}"}

# Get departments
resp = client.get("/api/v1/departments/", params={"per_page": 5}, headers=headers)
depts = resp.json().get("data", [])
if not depts:
    print("No depts found!")
else:
    dept = depts[0]
    dept_id = dept["id"]
    print(f"Testing edit on {dept['name']}")
    
    payload = {
        "name": dept["name"] + " Edit",
        "description": "Test edit",
        "code": dept.get("code", "TEST"),
        "head_id": None
    }
    
    resp = client.patch(f"/api/v1/departments/{dept_id}", json=payload, headers=headers)
    print("EDIT STATUS:", resp.status_code)
    print("EDIT RESPONSE:", resp.text)
    
    print(f"Testing delete on {dept['name']}")
    resp = client.delete(f"/api/v1/departments/{dept_id}", headers=headers)
    print("DELETE STATUS:", resp.status_code)
    print("DELETE RESPONSE:", resp.text)

import httpx
import asyncio

async def test_api():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api/v1") as client:
        # Try to login with John Doe or manager
        res = await client.post("/auth/login", data={
            "username": "manager@trainiq.com", # manager is an employee
            "password": "Welcome@123"
        })
        if res.status_code != 200:
            print("Login failed:", res.status_code, res.text)
            return
            
        token = res.json()["access_token"]
        print("Logged in!")
        
        # Test self nomination
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "suggested_title": "ssffng",
            "business_reason": "sfdbc dgb dgg",
            "expected_outcome": "sgsh dghb sgshs",
            "preferred_mode": "online",
            "estimated_cost": 0
        }
        res2 = await client.post("/nominations/self", json=payload, headers=headers)
        print("Response status:", res2.status_code)
        print("Response body:", res2.text)

if __name__ == "__main__":
    asyncio.run(test_api())

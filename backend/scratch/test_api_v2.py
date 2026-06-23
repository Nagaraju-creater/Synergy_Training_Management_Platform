import asyncio
import httpx

async def check():
    async with httpx.AsyncClient() as client:
        # First login to get token
        login_res = await client.post("http://localhost:8000/api/v1/auth/login", data={
            "username": "admin@trainiq.com",
            "password": "password123"
        })
        
        if login_res.status_code != 200:
            print("Login failed:", login_res.status_code, login_res.text)
            return
            
        token = login_res.json()["access_token"]
        
        # Now fetch trainings with the exact params frontend uses when all are "undefined"/empty
        res = await client.get("http://localhost:8000/api/v1/trainings/", headers={
            "Authorization": f"Bearer {token}"
        }, params={
            "page": 1,
            "per_page": 20
        })
        
        print(f"Status Code: {res.status_code}")
        print(f"Response data length: {len(res.json().get('data', []))}")
        print(f"Response meta: {res.json().get('meta')}")

if __name__ == "__main__":
    asyncio.run(check())

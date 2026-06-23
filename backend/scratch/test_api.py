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
            print("Login failed:", login_res.json())
            return
            
        token = login_res.json()["data"]["access_token"]
        
        # Now fetch trainings
        res = await client.get("http://localhost:8000/api/v1/trainings/", headers={
            "Authorization": f"Bearer {token}"
        })
        
        print(f"Status Code: {res.status_code}")
        print("Response:", res.json())

if __name__ == "__main__":
    asyncio.run(check())

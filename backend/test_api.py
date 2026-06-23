
import asyncio
import httpx

async def test_employees_list():
    async with httpx.AsyncClient() as client:
        # Assuming the server is running on localhost:8000
        # We might need an auth token
        # But let's just see if it's reachable and what it returns
        try:
            response = await client.get("http://localhost:8000/api/v1/employees/")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_employees_list())

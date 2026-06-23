
import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT name FROM roles"))
        print(f"Roles: {res.all()}")
        
        res = await conn.execute(text("SELECT email, role_id FROM users"))
        print(f"Users: {res.all()}")

if __name__ == "__main__":
    asyncio.run(main())

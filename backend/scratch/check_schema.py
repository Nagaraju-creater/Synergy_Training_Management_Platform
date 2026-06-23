
import asyncio
from app.database import engine
from sqlalchemy import text

async def check():
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT * FROM trainings LIMIT 1"))
            print(f"Columns: {res.keys()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())


import asyncio
from app.database import engine
from sqlalchemy import text

async def fix():
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE trainings ADD COLUMN IF NOT EXISTS start_time VARCHAR(20)"))
            print("Added start_time column")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix())

import asyncio
from sqlalchemy import text
from app.database import engine

async def update():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE enrollments ADD COLUMN progress FLOAT DEFAULT 0.0"))
            print("Successfully added progress column.")
        except Exception as e:
            print("Column might already exist or error:", e)

if __name__ == "__main__":
    asyncio.run(update())

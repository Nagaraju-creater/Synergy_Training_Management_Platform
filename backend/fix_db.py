import asyncio
import uuid
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def fix():
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(text("ALTER TABLE trainings ADD COLUMN IF NOT EXISTS is_attendance_enabled BOOLEAN DEFAULT TRUE"))
            await session.commit()
            print("Successfully added is_attendance_enabled column to trainings table")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix())

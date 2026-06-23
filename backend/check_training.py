import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from app.database import engine, AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT id, title, start_date, start_time, duration_hours FROM trainings WHERE title ILIKE '%python%'"))
        for row in res.fetchall():
            print(row)

asyncio.run(check())

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://postgres:Postgres%40123@localhost:5432/training_db')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT title, start_date, enrollment_deadline FROM trainings LIMIT 5"))
        for row in res:
            print(f"Title: {row.title}")
            print(f"Start: {row.start_date}")
            print(f"Deadline: {row.enrollment_deadline}")

if __name__ == '__main__':
    asyncio.run(run())

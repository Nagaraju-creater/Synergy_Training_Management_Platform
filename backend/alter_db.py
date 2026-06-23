import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://postgres:Postgres%40123@localhost:5432/training_db')
    async with engine.connect() as conn:
        await conn.execute(text("ALTER TABLE trainings ALTER COLUMN enrollment_deadline TYPE TIMESTAMP;"))
        await conn.commit()
        print("Successfully altered enrollment_deadline to TIMESTAMP.")

if __name__ == '__main__':
    asyncio.run(run())

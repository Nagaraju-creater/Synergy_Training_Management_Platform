import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://postgres:Postgres%40123@localhost:5432/training_db')
    async with engine.connect() as conn:
        # Update existing deadlines to end of day if they currently end at exactly midnight
        await conn.execute(text("UPDATE trainings SET enrollment_deadline = enrollment_deadline + interval '23 hours 59 minutes' WHERE EXTRACT(HOUR FROM enrollment_deadline) = 0 AND EXTRACT(MINUTE FROM enrollment_deadline) = 0;"))
        await conn.commit()
        print("Successfully updated existing deadlines.")

if __name__ == '__main__':
    asyncio.run(run())

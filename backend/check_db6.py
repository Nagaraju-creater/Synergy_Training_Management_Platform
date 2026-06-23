import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://postgres:Postgres%40123@localhost:5432/training_db')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trainings' AND column_name = 'enrollment_deadline'"))
        for row in res:
            print(f"{row.column_name}: {row.data_type}")

if __name__ == '__main__':
    asyncio.run(run())

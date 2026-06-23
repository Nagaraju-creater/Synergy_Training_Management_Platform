import asyncio
from sqlalchemy import text
from app.database import engine

async def check_indices():
    async with engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'users';
        """))
        for row in result:
            print(f"Index: {row.indexname}")
            print(f"Definition: {row.indexdef}")

if __name__ == "__main__":
    asyncio.run(check_indices())

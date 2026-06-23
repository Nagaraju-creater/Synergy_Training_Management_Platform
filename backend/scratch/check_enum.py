import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT enum_range(NULL::nominationstatus)"))
        print("Enum Values:", res.scalar())

if __name__ == "__main__":
    asyncio.run(check())

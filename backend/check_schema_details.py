import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'employees'"))
        for r in res.fetchall():
            print(r)
            
        print("\nChecking 'departments' table:")
        res = await conn.execute(text("SELECT column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'departments'"))
        for r in res.fetchall():
            print(r)

if __name__ == "__main__":
    asyncio.run(main())

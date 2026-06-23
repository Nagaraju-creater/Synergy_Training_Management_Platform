
import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'nominations' AND column_name = 'status'
        """))
        print(f"Status column info: {res.first()}")
        
        # Check distinct values in status
        res = await conn.execute(text("SELECT DISTINCT status FROM nominations"))
        print(f"Current status values: {[r[0] for r in res]}")

if __name__ == "__main__":
    asyncio.run(main())

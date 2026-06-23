import asyncio
from sqlalchemy import text
from app.database import engine

async def cleanup():
    async with engine.begin() as conn:
        # Just delete the employees
        res = await conn.execute(text("DELETE FROM employees WHERE deleted_at IS NOT NULL"))
        print(f"Deleted {res.rowcount} soft-deleted employee records.")

if __name__ == "__main__":
    asyncio.run(cleanup())

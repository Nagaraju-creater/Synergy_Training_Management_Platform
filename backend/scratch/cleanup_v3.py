import asyncio
from sqlalchemy import text
from app.database import engine

async def cleanup():
    async with engine.begin() as conn:
        # Clear manager links for deleted employees
        await conn.execute(text("""
            UPDATE employees 
            SET manager_id = NULL 
            WHERE manager_id IN (SELECT id FROM employees WHERE deleted_at IS NOT NULL)
        """))
        # Delete employees
        res = await conn.execute(text("DELETE FROM employees WHERE deleted_at IS NOT NULL"))
        print(f"Deleted {res.rowcount} soft-deleted employee records.")

if __name__ == "__main__":
    asyncio.run(cleanup())

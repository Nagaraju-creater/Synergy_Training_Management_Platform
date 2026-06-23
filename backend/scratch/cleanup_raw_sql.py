import asyncio
from sqlalchemy import text
from app.database import engine

async def cleanup():
    async with engine.begin() as conn:
        # Get count
        res = await conn.execute(text("SELECT count(*) FROM employees WHERE deleted_at IS NOT NULL"))
        count = res.scalar()
        print(f"Found {count} soft-deleted employees.")
        
        if count > 0:
            # Delete linked users first
            await conn.execute(text("""
                DELETE FROM users 
                WHERE id IN (SELECT user_id FROM employees WHERE deleted_at IS NOT NULL)
            """))
            # Delete employees
            await conn.execute(text("DELETE FROM employees WHERE deleted_at IS NOT NULL"))
            print("Soft-deleted records removed permanently.")
        else:
            print("No records to clean up.")

if __name__ == "__main__":
    asyncio.run(cleanup())

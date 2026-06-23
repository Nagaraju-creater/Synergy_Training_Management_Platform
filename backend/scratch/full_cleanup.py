import asyncio
from sqlalchemy import text
from app.database import engine

async def cleanup():
    async with engine.begin() as conn:
        # Get IDs of soft-deleted employees
        res = await conn.execute(text("SELECT id FROM employees WHERE deleted_at IS NOT NULL"))
        ids = [str(r[0]) for r in res.all()]
        
        if not ids:
            print("No soft-deleted records found.")
            return

        id_list = ", ".join([f"'{i}'" for i in ids])
        
        # Delete related records
        tables = [
            "enrollments", "nominations", "achievements", 
            "leaderboard_points", "attendance", "effectiveness"
        ]
        for table in tables:
            try:
                await conn.execute(text(f"DELETE FROM {table} WHERE employee_id IN ({id_list})"))
            except Exception as e:
                print(f"Skipping {table}: {e}")

        # Clear manager links
        await conn.execute(text(f"UPDATE employees SET manager_id = NULL WHERE manager_id IN ({id_list})"))
        
        # Delete employees
        res = await conn.execute(text(f"DELETE FROM employees WHERE id IN ({id_list})"))
        print(f"Deleted {res.rowcount} employee records permanently.")

if __name__ == "__main__":
    asyncio.run(cleanup())

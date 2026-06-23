import asyncio
from sqlalchemy import text
from app.database import engine

async def cleanup():
    # Get IDs of soft-deleted employees
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id FROM employees WHERE deleted_at IS NOT NULL"))
        ids = [str(r[0]) for r in res.all()]
    
    if not ids:
        print("No soft-deleted records found.")
        return

    print(f"Cleaning up {len(ids)} employees...")

    for i in ids:
        async with engine.begin() as conn:
            print(f"Processing ID: {i}")
            # Try to delete related stuff
            for table in ["enrollments", "nominations", "achievements", "leaderboard_points", "attendance"]:
                try:
                    await conn.execute(text(f"DELETE FROM {table} WHERE employee_id = '{i}'"))
                except: pass
            
            # Clear manager links
            await conn.execute(text(f"UPDATE employees SET manager_id = NULL WHERE manager_id = '{i}'"))
            
            # Delete employee
            try:
                await conn.execute(text(f"DELETE FROM employees WHERE id = '{i}'"))
                print(f"Deleted {i}")
            except Exception as e:
                print(f"Failed to delete {i}: {e}")

if __name__ == "__main__":
    asyncio.run(cleanup())

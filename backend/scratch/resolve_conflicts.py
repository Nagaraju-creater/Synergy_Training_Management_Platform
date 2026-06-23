import asyncio
from sqlalchemy import text
from app.database import engine

async def resolve_conflicts():
    async with engine.begin() as conn:
        # Rename codes and emails of soft-deleted records to stop conflicts
        await conn.execute(text("""
            UPDATE employees 
            SET employee_code = employee_code || '_del_' || substr(id::text, 1, 4),
                email = 'del_' || substr(id::text, 1, 4) || '_' || email
            WHERE deleted_at IS NOT NULL
        """))
        print("Conflicts resolved by renaming soft-deleted records.")

if __name__ == "__main__":
    asyncio.run(resolve_conflicts())

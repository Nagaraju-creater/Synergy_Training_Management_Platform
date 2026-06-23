"""
Migration: Add manager_id column to nominations table.
Run from the backend directory:
    python add_manager_id_to_nominations.py
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def migrate():
    async with engine.begin() as conn:
        # Add manager_id column (FK → users.id, nullable so existing rows are unaffected)
        await conn.execute(text("""
            ALTER TABLE nominations
            ADD COLUMN IF NOT EXISTS manager_id UUID
            REFERENCES users(id) ON DELETE SET NULL;
        """))

        # Add index for fast look-ups by manager
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_nominations_manager_id
            ON nominations (manager_id);
        """))

        print("[OK] manager_id column and index added to nominations table.")

        # Back-fill existing nominations: resolve manager from employee's manager_id
        await conn.execute(text("""
            UPDATE nominations n
            SET manager_id = mgr_emp.user_id
            FROM employees emp
            JOIN employees mgr_emp ON mgr_emp.id = emp.manager_id
            WHERE emp.id = n.employee_id
              AND n.manager_id IS NULL
              AND mgr_emp.user_id IS NOT NULL;
        """))

        # Back-fill remaining nulls via department head
        await conn.execute(text("""
            UPDATE nominations n
            SET manager_id = head_emp.user_id
            FROM employees emp
            JOIN departments dept ON dept.id = emp.department_id
            JOIN employees head_emp ON head_emp.id = dept.head_id
            WHERE emp.id = n.employee_id
              AND n.manager_id IS NULL
              AND head_emp.user_id IS NOT NULL
              AND head_emp.id != emp.id;
        """))

        updated = await conn.execute(text(
            "SELECT COUNT(*) FROM nominations WHERE manager_id IS NOT NULL"
        ))
        count = updated.scalar()
        print(f"[OK] Back-filled manager_id for {count} existing nomination(s).")


if __name__ == "__main__":
    asyncio.run(migrate())

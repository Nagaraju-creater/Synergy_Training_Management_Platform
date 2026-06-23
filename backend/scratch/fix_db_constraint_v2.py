
import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        print("Dropping incorrect foreign key constraint...")
        await conn.execute(text("ALTER TABLE nominations DROP CONSTRAINT IF EXISTS nominations_manager_id_fkey"))
        
        print("Updating existing manager_id values from user_id to employee_id...")
        # Map user_id to employee_id where possible
        await conn.execute(text("""
            UPDATE nominations
            SET manager_id = employees.id
            FROM employees
            WHERE nominations.manager_id = employees.user_id
        """))
        
        print("Setting remaining invalid manager_id values to NULL...")
        # Set to NULL if the manager_id still doesn't exist in employees
        await conn.execute(text("""
            UPDATE nominations
            SET manager_id = NULL
            WHERE manager_id NOT IN (SELECT id FROM employees)
        """))
        
        print("Adding correct foreign key constraint...")
        await conn.execute(text("ALTER TABLE nominations ADD CONSTRAINT nominations_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL"))
        
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(main())

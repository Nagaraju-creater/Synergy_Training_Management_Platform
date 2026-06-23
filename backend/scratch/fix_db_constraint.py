
import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        print("Dropping incorrect foreign key constraint...")
        await conn.execute(text("ALTER TABLE nominations DROP CONSTRAINT IF EXISTS nominations_manager_id_fkey"))
        
        print("Adding correct foreign key constraint...")
        await conn.execute(text("ALTER TABLE nominations ADD CONSTRAINT nominations_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL"))
        
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(main())

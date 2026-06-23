import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'"))
        columns = [r[0] for r in res.fetchall()]
        print(f"Columns in 'employees': {columns}")
        
        if 'legal_entity' not in columns:
            print("Adding 'legal_entity' column to 'employees' table...")
            await conn.execute(text("ALTER TABLE employees ADD COLUMN legal_entity VARCHAR(150)"))
            await conn.commit()
            print("Column 'legal_entity' added successfully.")
        else:
            print("Column 'legal_entity' already exists.")

if __name__ == "__main__":
    asyncio.run(main())

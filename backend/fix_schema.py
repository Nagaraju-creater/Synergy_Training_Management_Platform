import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'"))
        columns = [r[0] for r in res.fetchall()]
        print(f"Columns in 'employees': {columns}")
        
        if 'location' not in columns:
            print("Adding 'location' column to 'employees' table...")
            await conn.execute(text("ALTER TABLE employees ADD COLUMN location VARCHAR(150)"))
            await conn.commit()
            print("Column 'location' added successfully.")
        else:
            print("Column 'location' already exists.")

if __name__ == "__main__":
    asyncio.run(main())

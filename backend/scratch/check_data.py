
import asyncio
from app.database import engine
from sqlalchemy import text

async def check():
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT id, title, start_date, start_time FROM trainings"))
            rows = res.all()
            print(f"Total: {len(rows)}")
            for row in rows[:5]:
                print(row)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())

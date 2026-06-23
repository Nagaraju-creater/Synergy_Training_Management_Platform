import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, employee_code, email, deleted_at FROM employees"))
        rows = res.all()
        print(f"Total employee records: {len(rows)}")
        for r in rows:
            print(f"ID: {r[0]} | Code: {r[1]} | Email: {r[2]} | Deleted: {r[3]}")

if __name__ == "__main__":
    asyncio.run(check())

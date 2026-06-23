import asyncio
from app.database import AsyncSessionLocal
from app.employees.models import Employee
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Employee))
        emps = res.scalars().all()
        print(f"Total employees: {len(emps)}")
        for e in emps:
            print(f"ID: {e.id} | Code: {e.employee_code} | Email: {e.email} | Deleted: {e.deleted_at}")

if __name__ == "__main__":
    asyncio.run(check())

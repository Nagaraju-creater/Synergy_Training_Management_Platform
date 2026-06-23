import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.registry import *
from app.employees.models import Employee

async def query_db():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Employee.email, Employee.employee_code, Employee.first_name, Employee.last_name))
        emps = res.fetchall()
        for e in emps:
            print(f"[{e.employee_code}] {e.first_name} {e.last_name} <{e.email}>")

if __name__ == "__main__":
    asyncio.run(query_db())

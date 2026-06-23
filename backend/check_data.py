import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.employees.models import Employee
from app.departments.models import Department

async def main():
    async with AsyncSessionLocal() as db:
        emps = (await db.execute(select(Employee))).scalars().all()
        print(f"Total employees in DB: {len(emps)}")
        for e in emps:
            print(f"- {e.first_name} {e.last_name} (Code: {e.employee_code}, Dept: {e.department_id}, Deleted: {e.deleted_at})")
            
        depts = (await db.execute(select(Department))).scalars().all()
        print(f"Total departments in DB: {len(depts)}")
        for d in depts:
            print(f"- {d.name} (ID: {d.id}, Code: {d.code})")

if __name__ == "__main__":
    asyncio.run(main())

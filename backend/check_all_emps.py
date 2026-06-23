import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.employees.models import Employee

async def main():
    async with AsyncSessionLocal() as db:
        emps = (await db.execute(select(Employee))).scalars().all()
        print(f"Total employees (including deleted): {len(emps)}")
        for e in emps:
            print(f"- {e.first_name} {e.last_name} (Code: {e.employee_code}, Deleted: {e.deleted_at})")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import app.models.registry # noqa: F401
from app.database import AsyncSessionLocal
from app.employees.service import EmployeeService
from app.employees.models import Employee, EmploymentStatus
from sqlalchemy import select

async def debug_managers():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Employee).where(Employee.deleted_at == None, Employee.status == EmploymentStatus.ACTIVE))
        all_active = res.scalars().all()
        print(f"Total active employees: {len(all_active)}")
        
        managers = await EmployeeService.get_managers(db)
        print(f"Managers from service: {len(managers)}")
        
        for m in managers[:10]:
            print(f"- {m.first_name} {m.last_name} ({m.id})")

if __name__ == "__main__":
    asyncio.run(debug_managers())

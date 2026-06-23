import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from app.employees.service import EmployeeService
from app.departments.service import DepartmentService
from app.employees.schemas import EmployeeCreate
from app.departments.schemas import DepartmentCreate
from app.employees.models import EmploymentStatus
from datetime import date
import uuid

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Create a department
        dept_payload = DepartmentCreate(
            name="Engineering Test",
            code=f"ENG-{uuid.uuid4().hex[:4]}",
            description="Test Dept"
        )
        dept = await DepartmentService.create(db, dept_payload)
        print(f"Created Department: {dept.name} (ID: {dept.id})")
        
        # 2. Create an employee in that department
        emp_payload = EmployeeCreate(
            employee_code=f"EMP-{uuid.uuid4().hex[:4]}",
            first_name="Eng",
            last_name="User",
            email=f"eng-{uuid.uuid4().hex[:6]}@example.com",
            status=EmploymentStatus.ACTIVE,
            department_id=dept.id,
            date_of_joining=date.today()
        )
        emp = await EmployeeService.create(db, emp_payload)
        print(f"Created Employee: {emp.first_name} in {dept.name}")
        
        await db.commit()
        
        # 3. Check counts
        depts, _ = await DepartmentService.get_all(db, 1, 10)
        for d in depts:
            if d.id == dept.id:
                print(f"Department {d.name} Headcount: {d.employee_count}")

if __name__ == "__main__":
    asyncio.run(main())

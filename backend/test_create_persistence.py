import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from app.employees.service import EmployeeService
from app.employees.schemas import EmployeeCreate
from app.employees.models import EmploymentStatus
from datetime import date
import uuid

async def main():
    async with AsyncSessionLocal() as db:
        # Create a test employee
        payload = EmployeeCreate(
            employee_code=f"TEST-{uuid.uuid4().hex[:6]}",
            first_name="Test",
            last_name="User",
            email=f"test-{uuid.uuid4().hex[:6]}@example.com",
            status=EmploymentStatus.ACTIVE,
            date_of_joining=date.today()
        )
        print(f"Creating employee {payload.employee_code}...")
        emp = await EmployeeService.create(db, payload)
        print(f"Employee created with ID: {emp.id}")
        
        # Verify it exists
        emp_check = await EmployeeService.get_by_id(db, emp.id)
        print(f"Verification: Found employee {emp_check.first_name} {emp_check.last_name}")
        
        await db.commit()
        print("Committed successfully.")

if __name__ == "__main__":
    asyncio.run(main())

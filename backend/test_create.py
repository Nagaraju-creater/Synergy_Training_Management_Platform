
import asyncio
from app.database import AsyncSessionLocal
from app.employees.service import EmployeeService
from app.employees.schemas import EmployeeCreate
from app.employees.models import EmploymentStatus

async def test_create():
    async with AsyncSessionLocal() as session:
        payload = EmployeeCreate(
            employee_code="TEST-001",
            first_name="Test",
            last_name="User",
            email="test@example.com",
            status=EmploymentStatus.ACTIVE
        )
        try:
            emp = await EmployeeService.create(session, payload)
            print(f"Created: {emp.id}")
            await session.commit()
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create())

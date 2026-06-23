import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from app.employees.service import EmployeeService
from app.employees.schemas import EmployeeCreate
from app.employees.models import EmploymentStatus
import uuid

async def test_create_employee():
    async with AsyncSessionLocal() as db:
        unique_id = str(uuid.uuid4())[:8]
        payload = EmployeeCreate(
            employee_code=f"TEST-{unique_id}",
            first_name="Verify",
            last_name="Tester",
            email=f"verify.{unique_id}@example.com",
            designation="QA Engineer",
            location="Remote",
            legal_entity="Test Corp LLC",
            status=EmploymentStatus.ACTIVE
        )
        try:
            emp = await EmployeeService.create(db, payload)
            print(f"Employee created successfully: {emp.id}")
            print(f"Legal Entity: {emp.legal_entity}")
            await db.commit()
            return True
        except Exception as e:
            print(f"Error creating employee: {e}")
            return False

if __name__ == "__main__":
    asyncio.run(test_create_employee())

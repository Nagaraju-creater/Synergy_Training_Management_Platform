
import asyncio
import json
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import engine, AsyncSessionLocal
from app.enrollments.models import Enrollment
from app.enrollments.schemas import EnrollmentResponse
# Import registry to ensure relationships are set up
import app.models.registry

async def main():
    async with AsyncSessionLocal() as db:
        stmt = select(Enrollment).options(
            selectinload(Enrollment.employee),
            selectinload(Enrollment.training)
        ).limit(1)
        res = await db.execute(stmt)
        e = res.scalar_one_or_none()
        if e:
            print("--- Model Object ---")
            print(f"employee relationship: {e.employee}")
            print(f"training relationship: {e.training}")
            print(f"employee_name property: {e.employee_name}")
            
            print("\n--- Pydantic Validation ---")
            schema = EnrollmentResponse.model_validate(e)
            data = schema.model_dump()
            print(json.dumps(data, indent=2, default=str))
        else:
            print("No enrollments found")

if __name__ == "__main__":
    asyncio.run(main())

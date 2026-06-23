
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import engine, AsyncSessionLocal
from app.enrollments.models import Enrollment
from app.enrollments.schemas import EnrollmentResponse

async def main():
    async with AsyncSessionLocal() as db:
        stmt = select(Enrollment).options(
            selectinload(Enrollment.employee),
            selectinload(Enrollment.training)
        ).limit(1)
        res = await db.execute(stmt)
        e = res.scalar_one_or_none()
        if e:
            print(f"Model properties: name={e.employee_name}, title={e.training_title}")
            schema = EnrollmentResponse.model_validate(e)
            print(f"Schema values: name={schema.employee_name}, title={schema.training_title}")
        else:
            print("No enrollments found")

if __name__ == "__main__":
    asyncio.run(main())

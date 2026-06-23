import asyncio
import app.models.registry
from app.database import AsyncSessionLocal
from app.employees.models import Employee
from app.trainings.models import Training
from app.enrollments.models import Enrollment
from sqlalchemy import select, func

async def check():
    async with AsyncSessionLocal() as db:
        e_count = (await db.execute(select(func.count()).select_from(Employee))).scalar_one()
        t_count = (await db.execute(select(func.count()).select_from(Training))).scalar_one()
        enr_count = (await db.execute(select(func.count()).select_from(Enrollment))).scalar_one()
        print(f"Employees: {e_count}")
        print(f"Trainings: {t_count}")
        print(f"Enrollments: {enr_count}")

if __name__ == "__main__":
    asyncio.run(check())

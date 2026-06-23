import asyncio
import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.registry import *
from app.employees.models import Employee, EmploymentStatus
from app.users.models import User
from app.roles.models import Role
from app.departments.models import Department
from app.users.service import UserService

async def create_emp():
    async with AsyncSessionLocal() as db:
        # Check if already exists
        email = "nandhuganesh555@gmail.com"
        res = await db.execute(select(Employee).where(Employee.email == email))
        if res.scalar_one_or_none():
            print("Already exists")
            return
            
        user_res = await db.execute(select(User).where(User.email == email))
        user = user_res.scalar_one_or_none()
        
        if not user:
            role_res = await db.execute(select(Role).where(Role.name == "Employee"))
            role = role_res.scalar_one_or_none()
            
            user = User(
                email=email,
                full_name="Nandhakumar G",
                role_id=role.id if role else None,
                hashed_password=UserService.hash_password("Welcome@123"),
                is_active=True,
                is_verified=True
            )
            db.add(user)
            await db.flush()
        
        dept_res = await db.execute(select(Department).where(Department.name == "NPD"))
        dept = dept_res.scalar_one_or_none()
        
        mgr_res = await db.execute(select(Employee).where(Employee.first_name.ilike("Naveenkumar%")))
        mgr = mgr_res.scalars().first()
        
        emp = Employee(
            employee_code="025",
            first_name="Nandhakumar",
            last_name="G",
            email=email,
            designation="NPD Engineer",
            department_id=dept.id if dept else None,
            manager_id=mgr.id if mgr else None,
            location="Hosur",
            legal_entity="SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED",
            date_of_joining=datetime.date(2023, 11, 15),
            user_id=user.id,
            status=EmploymentStatus.ACTIVE
        )
        db.add(emp)
        await db.commit()
        print("Created Nandhakumar G")

if __name__ == "__main__":
    asyncio.run(create_emp())

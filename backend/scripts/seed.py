import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy import select

import app.models.registry # Ensure all models are registered
from app.departments.models import Department, DepartmentHead
from app.employees.models import Employee, EmploymentStatus
from app.roles.models import Role
from app.trainings.models import Training, TrainingStatus, TrainingType
from app.users.models import User
from app.users.service import UserService
from app.database import AsyncSessionLocal


async def seed_data():
    async with AsyncSessionLocal() as db:
        print("Starting database seeding...")

        # 0. Create Roles
        admin_role_data = {"name": "Admin", "description": "System Administrator"}
        employee_role_data = {"name": "Employee", "description": "Standard User"}
        
        result = await db.execute(select(Role).where(Role.name == "Admin"))
        admin_role = result.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(**admin_role_data)
            db.add(admin_role)

        result = await db.execute(select(Role).where(Role.name == "Employee"))
        employee_role = result.scalar_one_or_none()
        if not employee_role:
            employee_role = Role(**employee_role_data)
            db.add(employee_role)

        await db.flush()

        # 1. Create Admin User
        admin_email = "admin@trainiq.com"
        result = await db.execute(select(User).where(User.email == admin_email))
        admin = result.scalar_one_or_none()

        if not admin:
            print(f"Creating admin user: {admin_email}")
            hashed_pw = UserService.hash_password("Welcome@123")
            admin = User(
                email=admin_email,
                hashed_password=hashed_pw,
                full_name="System Administrator",
                role_id=admin_role.id,
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            await db.flush()
        else:
            print("Admin user already exists.")

        # 2. Create Departments
        depts_data = [
            {"name": "Human Resources", "code": "HR"},
            {"name": "Engineering", "code": "ENG"},
            {"name": "Sales", "code": "SAL"},
            {"name": "Operations", "code": "OPS"},
            {"name": "Finance", "code": "FIN"},
        ]
        
        departments = []
        for d in depts_data:
            result = await db.execute(select(Department).where(Department.code == d["code"]))
            dept = result.scalar_one_or_none()
            if not dept:
                print(f"Creating department: {d['name']}")
                dept = Department(name=d["name"], code=d["code"])
                db.add(dept)
                await db.flush()
            departments.append(dept)

        # 3. Create Employees
        employee_names = [
            ("John", "Doe"), ("Jane", "Smith"), ("Robert", "Brown"), 
            ("Emily", "Davis"), ("Michael", "Wilson"), ("Sarah", "Miller"),
            ("David", "Taylor"), ("Linda", "Anderson"), ("James", "Thomas"),
            ("Patricia", "Jackson")
        ]
        
        employees = []
        for i, (first, last) in enumerate(employee_names):
            code = f"EMP{1000 + i}"
            result = await db.execute(select(Employee).where(Employee.employee_code == code))
            emp = result.scalar_one_or_none()
            
            if not emp:
                print(f"Creating employee: {first} {last}")
                dept = random.choice(departments)
                emp = Employee(
                    employee_code=code,
                    first_name=first,
                    last_name=last,
                    email=f"{first.lower()}.{last.lower()}@trainiq.com",
                    designation=random.choice(["Associate", "Senior", "Lead", "Manager"]),
                    status=EmploymentStatus.ACTIVE,
                    department_id=dept.id,
                    date_of_joining=(datetime.now() - timedelta(days=random.randint(100, 1000))).date()
                )
                db.add(emp)
                await db.flush()
            employees.append(emp)

        # 4. Create Trainings
        trainings_data = [
            {
                "title": "Onboarding 2024",
                "type": TrainingType.INTERNAL,
                "status": TrainingStatus.COMPLETED,
                "days_ago": 30
            },
            {
                "title": "Advanced Python Architecture",
                "type": TrainingType.WORKSHOP,
                "status": TrainingStatus.ONGOING,
                "days_ago": -5
            },
            {
                "title": "Management Principles",
                "type": TrainingType.EXTERNAL,
                "status": TrainingStatus.SCHEDULED,
                "days_ago": -20
            }
        ]

        for t in trainings_data:
            result = await db.execute(select(Training).where(Training.title == t["title"]))
            training = result.scalar_one_or_none()
            
            if not training:
                print(f"Creating training: {t['title']}")
                start = (datetime.now() - timedelta(days=t["days_ago"])).date()
                training = Training(
                    title=t["title"],
                    training_type=t["type"],
                    status=t["status"],
                    start_date=start,
                    end_date=start + timedelta(days=3),
                    duration_hours=12,
                    max_participants=20,
                    created_by=admin.id
                )
                db.add(training)
        
        await db.commit()
        print("Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_data())

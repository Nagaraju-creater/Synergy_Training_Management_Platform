import asyncio
from sqlalchemy import select
from app.models.registry import * # noqa: F401
from app.users.models import User
from app.employees.models import Employee
from app.roles.models import Role
from app.users.service import UserService
from app.database import AsyncSessionLocal

async def seed_credentials():
    async with AsyncSessionLocal() as db:
        print("Seeding user credentials for all employees...")
        
        # 1. Get Roles
        res = await db.execute(select(Role))
        roles = res.scalars().all()
        role_map = {r.name.lower(): r.id for r in roles}
        
        if 'admin' not in role_map:
            admin_role = Role(name="Admin", description="System Administrator")
            db.add(admin_role)
            await db.flush()
            role_map['admin'] = admin_role.id
            
        if 'manager' not in role_map:
            mgr_role = Role(name="Manager", description="Department Manager")
            db.add(mgr_role)
            await db.flush()
            role_map['manager'] = mgr_role.id

        if 'employee' not in role_map:
            emp_role = Role(name="Employee", description="Standard Employee")
            db.add(emp_role)
            await db.flush()
            role_map['employee'] = emp_role.id

        # 2. Get all employees
        res = await db.execute(select(Employee))
        employees = res.scalars().all()
        
        for emp in employees:
            # Check if user already exists
            res = await db.execute(select(User).where(User.email == emp.email))
            user = res.scalar_one_or_none()
            
            if not user:
                print(f"Creating user for {emp.first_name} {emp.last_name} ({emp.email})")
                user = User(
                    email=emp.email,
                    full_name=f"{emp.first_name} {emp.last_name}",
                    hashed_password=UserService.hash_password("Welcome@123"),
                    role_id=role_map['employee'],
                    is_active=True,
                    is_verified=True
                )
                db.add(user)
                await db.flush()
                emp.user_id = user.id
        
        manager_email = "manager@trainiq.com"
        res = await db.execute(select(User).where(User.email == manager_email))
        manager_user = res.scalar_one_or_none()
        
        if not manager_user:
            print(f"Creating explicit manager user: {manager_email}")
            manager_user = User(
                email=manager_email,
                full_name="Team Manager",
                hashed_password=UserService.hash_password("Welcome@123"),
                role_id=role_map['manager'],
                is_active=True,
                is_verified=True
            )
            db.add(manager_user)
        else:
            print(f"Updating role for existing manager: {manager_email}")
            manager_user.role_id = role_map['manager']
        
        await db.flush()
            
        # Create employee record for manager if not exists
        res = await db.execute(select(Employee).where(Employee.email == manager_email))
        manager_emp = res.scalar_one_or_none()
        
        if not manager_emp:
            manager_emp = Employee(
                employee_code="MGR001",
                first_name="Team",
                last_name="Manager",
                email=manager_email,
                designation="Manager",
                user_id=manager_user.id,
                department_id=employees[0].department_id if employees else None
            )
            db.add(manager_emp)
            await db.flush()
            
        # Assign this manager to some employees
        for emp in employees[:5]:
            emp.manager_id = manager_emp.id
                
        await db.commit()
        print("Credentials seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_credentials())

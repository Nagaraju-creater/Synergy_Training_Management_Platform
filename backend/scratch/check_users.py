import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry
from app.users.models import User
from app.employees.models import Employee

async def check():
    async with AsyncSessionLocal() as db:
        # Check a few recent users
        res = await db.execute(select(User).order_by(User.created_at.desc()).limit(5))
        users = res.scalars().all()
        print("Recent Users in DB:")
        for u in users:
            print(f"- Email: {u.email}, Full Name: {u.full_name}, Role ID: {u.role_id}, Is Active: {u.is_active}")
        
        # Check if an employee exists without a user
        res_emp = await db.execute(select(Employee).where(Employee.user_id == None))
        emps_no_user = res_emp.scalars().all()
        print(f"\nEmployees without User account: {len(emps_no_user)}")
        for e in emps_no_user:
            print(f"- {e.first_name} {e.last_name} ({e.email})")

if __name__ == "__main__":
    asyncio.run(check())

import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry
from app.users.models import User
from app.employees.models import Employee

async def search_and_check(name_part):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.full_name.ilike(f"%{name_part}%")))
        users = res.scalars().all()
        
        if not users:
            print(f"No users found matching '{name_part}'")
            return
            
        for user in users:
            print(f"\nUser: {user.email}, Name: {user.full_name}, ID: {user.id}")
            
            res_emp = await db.execute(select(Employee).where(Employee.user_id == user.id))
            emp = res_emp.scalar_one_or_none()
            if emp:
                print(f"  Linked Employee: {emp.first_name} {emp.last_name}, ID: {emp.id}")
            else:
                print("  NO LINKED EMPLOYEE found for this user ID.")
                # Search by email
                res_emp_email = await db.execute(select(Employee).where(Employee.email.ilike(user.email)))
                emp_email = res_emp_email.scalar_one_or_none()
                if emp_email:
                    print(f"  Found employee with matching email: {emp_email.first_name} {emp_email.last_name}, ID: {emp_email.id}, user_id: {emp_email.user_id}")
                else:
                    print("  No employee record found with this email either.")

if __name__ == "__main__":
    asyncio.run(search_and_check("Rajeshwari"))

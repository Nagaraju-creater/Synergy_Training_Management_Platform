import asyncio
from app.database import AsyncSessionLocal
from app.employees.models import Employee
from app.users.models import User
from sqlalchemy import select, delete

async def cleanup():
    async with AsyncSessionLocal() as db:
        # Find employees with deleted_at set
        res = await db.execute(select(Employee).where(Employee.deleted_at != None))
        emps = res.scalars().all()
        print(f"Found {len(emps)} soft-deleted employees to remove permanently.")
        
        for emp in emps:
            print(f"Hard deleting Employee: {emp.employee_code} ({emp.email})")
            # Delete associated user if exists
            if emp.user_id:
                await db.execute(delete(User).where(User.id == emp.user_id))
            await db.delete(emp)
        
        await db.commit()
        print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(cleanup())

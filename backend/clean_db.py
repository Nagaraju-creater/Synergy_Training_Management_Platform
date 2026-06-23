import asyncio
import app.models.registry
from app.database import AsyncSessionLocal
from app.employees.models import Employee
from app.users.models import User
from app.roles.models import Role
from app.enrollments.models import Enrollment
from app.nominations.models import Nomination
from app.effectiveness.models import Effectiveness
from sqlalchemy import delete, select

from sqlalchemy import text

async def clean_database():
    async with AsyncSessionLocal() as db:
        print("Cleaning employee-related data...")
        
        # 1. Delete dependent data in order
        tables = [
            "training_effectiveness",
            "attendance",
            "enrollments",
            "nominations",
            "achievements",
            "leaderboard_points",
            "employees"
        ]
        
        for table in tables:
            try:
                async with db.begin_nested():
                    await db.execute(text(f"DELETE FROM {table}"))
                    print(f"Deleted data from {table}")
            except Exception as e:
                if "UndefinedTableError" in str(e) or "relation" in str(e) and "does not exist" in str(e):
                    print(f"Table {table} does not exist, skipping.")
                else:
                    print(f"Error deleting from {table}: {e}")

        # 2. Delete users associated with employees (except those with 'admin' role)
        try:
            async with db.begin_nested():
                admin_role_res = await db.execute(select(Role.id).where(Role.name == "admin"))
                admin_role_id = admin_role_res.scalar_one_or_none()
                
                if admin_role_id:
                    await db.execute(delete(User).where(User.role_id != admin_role_id))
                else:
                    await db.execute(delete(User))
                print("Deleted non-admin users.")
        except Exception as e:
            print(f"Error deleting users: {e}")
            
        await db.commit()
        print("Database cleaned successfully. All employees and their associated data have been removed.")

if __name__ == "__main__":
    asyncio.run(clean_database())

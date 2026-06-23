
import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select, func, delete

# Import ALL models to avoid InvalidRequestError
from app.users.models import User
from app.roles.models import Role
from app.employees.models import Employee
from app.departments.models import Department, DepartmentHead
from app.trainings.models import Training
from app.trainings.categories import TrainingCategory
from app.enrollments.models import Enrollment
from app.nominations.models import Nomination
from app.effectiveness.models import Effectiveness
from app.effectiveness.reviews import DepartmentReview
from app.attendance.models import Attendance
from app.notifications.models import Notification
from app.signatures.models import DigitalSignature
from app.gamification.models import Achievement, LeaderboardPoint
from app.audit.models import AuditLog
from app.analytics.models import AnalyticsSnapshot

async def manage_data():
    async with AsyncSessionLocal() as session:
        # Check current counts
        emp_count = await session.scalar(select(func.count(Employee.id)))
        dept_count = await session.scalar(select(func.count(Department.id)))
        print(f"Current Employees: {emp_count}")
        print(f"Current Departments: {dept_count}")

        print("Clearing all data as requested...")
        
        # Order matters due to FKs
        await session.execute(delete(AnalyticsSnapshot))
        await session.execute(delete(AuditLog))
        await session.execute(delete(LeaderboardPoint))
        await session.execute(delete(Achievement))
        await session.execute(delete(DigitalSignature))
        await session.execute(delete(Attendance))
        await session.execute(delete(DepartmentReview))
        await session.execute(delete(Effectiveness))
        await session.execute(delete(Nomination))
        await session.execute(delete(Enrollment))
        await session.execute(delete(TrainingCategory))
        await session.execute(delete(Training))
        await session.execute(delete(DepartmentHead))
        await session.execute(delete(Notification))
        
        # Clear employees
        await session.execute(delete(Employee))
        
        # Clear departments
        await session.execute(delete(Department))
        
        # Optionally clear users if they are not system users?
        # The user specifically said "all employees and departments". 
        # I'll stick to that.
        
        await session.commit()
        print("Data cleared successfully.")

if __name__ == "__main__":
    asyncio.run(manage_data())

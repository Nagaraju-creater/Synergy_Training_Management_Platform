import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.roles.models import Role
from app.users.models import User
from app.employees.models import Employee
from app.departments.models import Department, DepartmentHead
from app.nominations.models import Nomination
from app.trainings.models import Training
from app.effectiveness.models import Effectiveness
from app.signatures.models import DigitalSignature
from app.notifications.models import Notification
from app.enrollments.models import Enrollment
from app.audit.models import AuditLog
from app.attendance.models import Attendance
from app.gamification.models import Achievement, LeaderboardPoint
from app.analytics.models import AnalyticsSnapshot
from app.trainings.categories import TrainingCategory
from app.effectiveness.reviews import DepartmentReview

async def debug_nagaraju_manasa():
    async with AsyncSessionLocal() as db:
        # 1. Get Nagaraju's Employee record
        res = await db.execute(select(Employee).where(Employee.first_name == "Nagaraju", Employee.last_name == "K"))
        nagaraju = res.scalar_one_or_none()
        
        # 2. Get Manasa's Employee record
        res = await db.execute(select(Employee).where(Employee.first_name == "Manasa", Employee.last_name == "R"))
        manasa = res.scalar_one_or_none()
        
        if nagaraju and manasa:
            print(f"Nagaraju ID: {nagaraju.id} | Dept ID: {nagaraju.department_id} | Manager ID: {nagaraju.manager_id}")
            print(f"Manasa ID: {manasa.id} | Dept ID: {manasa.department_id}")
            
            # Check who Nagaraju's manager is
            if nagaraju.manager_id:
                res = await db.execute(select(Employee).where(Employee.id == nagaraju.manager_id))
                mgr = res.scalar_one_or_none()
                if mgr:
                    print(f"Nagaraju's manager is: {mgr.first_name} {mgr.last_name} (ID: {mgr.id})")
            
            # Check if Manasa is a head of ANY department
            res = await db.execute(select(Department).where(Department.head_id == manasa.id))
            depts = res.scalars().all()
            for d in depts:
                print(f"Manasa is Head of Department: {d.name} (ID: {d.id})")

            # Check if there are any other Manasa R or Nagaraju K
            res = await db.execute(select(Employee).where(Employee.first_name == "Nagaraju"))
            print(f"Total employees named Nagaraju: {len(res.scalars().all())}")

if __name__ == "__main__":
    asyncio.run(debug_nagaraju_manasa())

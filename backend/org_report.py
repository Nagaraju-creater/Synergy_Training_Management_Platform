import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.employees.models import Employee
from app.departments.models import Department
from app.users.models import User
from app.roles.models import Role

# Import everything to avoid relationship issues
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

async def generate_org_report():
    async with AsyncSessionLocal() as db:
        print("\n" + "="*80)
        print(f"{'EMPLOYEE NAME':<30} | {'MANAGER':<25} | {'DEPARTMENT':<15}")
        print("-" * 80)
        
        stmt = select(Employee).order_by(Employee.first_name)
        res = await db.execute(stmt)
        employees = res.scalars().all()
        
        for e in employees:
            name = f"{e.first_name} {e.last_name}"
            
            # Find Manager
            manager_name = "None"
            if e.manager_id:
                m_res = await db.execute(select(Employee).where(Employee.id == e.manager_id))
                m = m_res.scalar_one_or_none()
                if m:
                    manager_name = f"{m.first_name} {m.last_name}"
            
            # Find Dept
            dept_name = "N/A"
            if e.department_id:
                d_res = await db.execute(select(Department).where(Department.id == e.department_id))
                d = d_res.scalar_one_or_none()
                if d:
                    dept_name = d.name
            
            print(f"{name:<30} | {manager_name:<25} | {dept_name:<15}")
        print("="*80 + "\n")

if __name__ == "__main__":
    asyncio.run(generate_org_report())

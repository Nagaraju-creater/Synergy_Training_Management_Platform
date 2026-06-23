import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.users.models import User
from app.roles.models import Role
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

async def check_srinivasan():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Employee).where(Employee.first_name == "Srinivasan", Employee.last_name == "Beeman"))
        s = res.scalar_one_or_none()
        if s:
            print(f"Srinivasan Employee ID: {s.id}")
            print(f"Srinivasan Dept ID: {s.department_id}")
            print(f"Srinivasan Manager ID: {s.manager_id}")
            
            if s.manager_id:
                m_res = await db.execute(select(Employee).where(Employee.id == s.manager_id))
                m = m_res.scalar_one_or_none()
                if m:
                    print(f"Srinivasan's Manager: {m.first_name} {m.last_name}")
            
            if s.department_id:
                d_res = await db.execute(select(Department).where(Department.id == s.department_id))
                d = d_res.scalar_one_or_none()
                if d:
                    print(f"Srinivasan's Dept: {d.name}")
                    if d.head_id:
                        h_res = await db.execute(select(Employee).where(Employee.id == d.head_id))
                        h = h_res.scalar_one_or_none()
                        if h:
                            print(f"Srinivasan's Dept Head: {h.first_name} {h.last_name}")

if __name__ == "__main__":
    asyncio.run(check_srinivasan())

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

async def find_managers():
    async with AsyncSessionLocal() as db:
        print("\n--- DEPT HEADS ---")
        depts_res = await db.execute(select(Department))
        depts = depts_res.scalars().all()
        for d in depts:
            if d.head_id:
                h_res = await db.execute(select(Employee).where(Employee.id == d.head_id))
                h = h_res.scalar_one_or_none()
                if h:
                    print(f"Manager (Dept Head): {h.first_name} {h.last_name} (Dept: {d.name})")

        print("\n--- DIRECT MANAGERS (from Employee.manager_id) ---")
        mgr_ids_res = await db.execute(select(Employee.manager_id).where(Employee.manager_id != None).distinct())
        mgr_ids = mgr_ids_res.scalars().all()
        for mid in mgr_ids:
            m_res = await db.execute(select(Employee).where(Employee.id == mid))
            m = m_res.scalar_one_or_none()
            if m:
                print(f"Manager (Direct Reports): {m.first_name} {m.last_name}")

        print("\n--- USERS WITH MANAGER ROLE ---")
        users_res = await db.execute(select(User).join(Role).where(Role.name.ilike("manager")))
        users = users_res.scalars().all()
        for u in users:
            print(f"User with Manager Role: {u.full_name} ({u.email})")

        print("\n--- DIRECT MANAGERS (from Employee.manager_id) ---")
        mgr_ids_res = await db.execute(select(Employee.manager_id).where(Employee.manager_id != None).distinct())
        mgr_ids = mgr_ids_res.scalars().all()
        for mid in mgr_ids:
            m_res = await db.execute(select(Employee).where(Employee.id == mid))
            m = m_res.scalar_one_or_none()
            if m:
                print(f"Manager (Direct Reports): {m.first_name} {m.last_name}")

        print("\n--- USERS WITH MANAGER ROLE ---")
        users_res = await db.execute(select(User).join(Role).where(Role.name.ilike("manager")))
        users = users_res.scalars().all()
        for u in users:
            print(f"User with Manager Role: {u.full_name} ({u.email})")

if __name__ == "__main__":
    asyncio.run(find_managers())

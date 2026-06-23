import asyncio
import uuid
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

async def debug_roles():
    async with AsyncSessionLocal() as db:
        print("\n=== SYSTEM ROLES ===")
        roles_res = await db.execute(select(Role))
        roles = roles_res.scalars().all()
        for r in roles:
            print(f"Role: {r.name}")
        
        print("\n=== MANAGERS & DEPT HEADS ===")
        # Find anyone who is a head_id in any department
        depts_res = await db.execute(select(Department))
        depts = depts_res.scalars().all()
        for d in depts:
            head_name = "None"
            if d.head_id:
                h_res = await db.execute(select(Employee).where(Employee.id == d.head_id))
                h = h_res.scalar_one_or_none()
                if h:
                    head_name = f"{h.first_name} {h.last_name}"
            print(f"Dept: {d.name} | Head: {head_name}")

        print("\n=== USERS & THEIR ROLES ===")
        users_res = await db.execute(select(User).options(selectinload(User.role), selectinload(User.employee)))
        users = users_res.scalars().all()
        for u in users:
            role_name = u.role.name if u.role else "N/A"
            emp_info = f"{u.employee.first_name} {u.employee.last_name}" if u.employee else "No Emp Record"
            print(f"User: {u.full_name} ({u.email}) | Role: {role_name} | Employee: {emp_info}")

if __name__ == "__main__":
    from sqlalchemy.orm import selectinload
    asyncio.run(debug_roles())

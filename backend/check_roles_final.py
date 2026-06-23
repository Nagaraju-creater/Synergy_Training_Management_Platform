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

async def check_roles():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Role))
        roles = res.scalars().all()
        for r in roles:
            print(f"Role: {r.name} | ID: {r.id}")

if __name__ == "__main__":
    asyncio.run(check_roles())

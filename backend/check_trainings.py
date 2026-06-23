import asyncio
from app.database import AsyncSessionLocal
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
from app.attendance.models import AttendanceSession, AttendanceRecord, AttendanceLog
from app.notifications.models import Notification
from app.signatures.models import DigitalSignature
from app.gamification.models import Achievement, LeaderboardPoint
from app.audit.models import AuditLog
from app.analytics.models import AnalyticsSnapshot

from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check():
    async with AsyncSessionLocal() as session:
        stmt = select(Training).options(selectinload(Training.departments))
        res = await session.execute(stmt)
        trainings = res.scalars().all()
        print(f"Found {len(trainings)} trainings")
        for t in trainings:
            dept_names = [d.name for d in t.departments]
            print(f"ID: {t.id}, Title: {t.title}, Status: {t.status}, IsGlobal: {t.is_global}, Departments: {dept_names}, Archived: {t.is_archived}")

if __name__ == "__main__":
    asyncio.run(check())

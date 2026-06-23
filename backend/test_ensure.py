import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from app.database import engine, AsyncSessionLocal

# Import all models to avoid InvalidRequestError
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

from app.attendance.service import AttendanceService

async def test_ensure():
    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(text("SELECT id FROM trainings LIMIT 1"))
            training_id = res.scalar()
            print(f"Testing for training_id: {training_id}")
            if training_id:
                session = await AttendanceService.ensure_session(db, training_id)
                print(f"Session created with id: {session.id}")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_ensure())

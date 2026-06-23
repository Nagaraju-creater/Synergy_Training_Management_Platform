import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Import all models to prevent mapper errors
from app.users.models import User  # noqa: F401
from app.roles.models import Role  # noqa: F401
from app.employees.models import Employee  # noqa: F401
from app.departments.models import Department, DepartmentHead  # noqa: F401
from app.trainings.models import Training, TrainingImportHistory  # noqa: F401
from app.trainings.categories import TrainingCategory  # noqa: F401
from app.enrollments.models import Enrollment  # noqa: F401
from app.nominations.models import Nomination  # noqa: F401
from app.effectiveness.models import Effectiveness  # noqa: F401
from app.effectiveness.reviews import DepartmentReview  # noqa: F401
from app.attendance.models import AttendanceSession, AttendanceRecord, AttendanceLog  # noqa: F401
from app.notifications.models import Notification  # noqa: F401
from app.signatures.models import DigitalSignature  # noqa: F401
from app.gamification.models import Achievement, LeaderboardPoint  # noqa: F401
from app.audit.models import AuditLog  # noqa: F401
from app.analytics.models import AnalyticsSnapshot  # noqa: F401
from app.training_plans.models import TrainingPlan  # noqa: F401

from app.database import AsyncSessionLocal
from sqlalchemy import select

async def main():
    db = AsyncSessionLocal()
    try:
        res = await db.execute(select(Department))
        depts = res.scalars().all()
        print(f"Found {len(depts)} departments:")
        for d in depts:
            print(f"- '{d.name}' (Code: '{d.code}', ID: {d.id})")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(main())

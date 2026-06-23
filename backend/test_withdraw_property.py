import asyncio
import sys
import os
import traceback

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import all models to prevent clsregistry map configuration issues in SQLAlchemy
from app.users.models import User
from app.roles.models import Role
from app.employees.models import Employee
from app.departments.models import Department, DepartmentHead
from app.trainings.models import Training
from app.trainings.categories import TrainingCategory
from app.enrollments.models import Enrollment, EnrollmentStatus
from app.nominations.models import Nomination
from app.effectiveness.models import Effectiveness
from app.effectiveness.reviews import DepartmentReview
from app.attendance.models import AttendanceSession, AttendanceRecord, AttendanceLog
from app.notifications.models import Notification
from app.signatures.models import DigitalSignature
from app.gamification.models import Achievement, LeaderboardPoint
from app.audit.models import AuditLog
from app.analytics.models import AnalyticsSnapshot
from app.training_plans.models import TrainingPlan

from app.database import AsyncSessionLocal
from app.enrollments.service import EnrollmentService
from sqlalchemy import select

async def main():
    try:
        print("Connecting to database...")
        async with AsyncSessionLocal() as db:
            # Let's find one approved enrollment
            res = await db.execute(select(Enrollment).limit(1))
            enrollment = res.scalar_one_or_none()
            if not enrollment:
                print("No enrollment found.")
                return

            print(f"Testing withdraw for Enrollment: {enrollment.id}...")
            
            # Temporarily ensure approved/enrolled status
            enrollment.status = EnrollmentStatus.APPROVED
            await db.flush()

            # Call withdraw
            e = await EnrollmentService.withdraw(db, enrollment.id, "Test withdrawal reason")
            print("Successfully withdrew!")
            await db.rollback()

    except Exception as ex:
        print("--- EXCEPTION CAUGHT ---")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

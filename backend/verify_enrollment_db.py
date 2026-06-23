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
from app.training_plans.models import TrainingPlan

from app.database import AsyncSessionLocal
from app.enrollments.service import EnrollmentService
from sqlalchemy import select

async def main():
    try:
        print("Connecting to database...")
        async with AsyncSessionLocal() as db:
            # Let's find one enrollment ID
            res = await db.execute(select(Enrollment).limit(1))
            enrollment = res.scalar_one_or_none()
            if not enrollment:
                print("No enrollments found in database.")
                return
            
            print(f"Found enrollment ID: {enrollment.id}. Testing get_by_id...")
            e = await EnrollmentService.get_by_id(db, enrollment.id)
            print(f"Successfully loaded enrollment: {e.id}")
            print(f"Employee: {e.employee.first_name} {e.employee.last_name}")
            print(f"Training: {e.training.title}")
            print(f"Category: {e.training.category.name if e.training.category else 'None'}")
            print(f"Creator: {e.training.creator.email if e.training.creator else 'None'}")

    except Exception as ex:
        print("--- EXCEPTION CAUGHT ---")
        traceback.print_exc()

if __name__ == "__main__":
    # We must run it with settings.DATABASE_URL from env if configured
    asyncio.run(main())

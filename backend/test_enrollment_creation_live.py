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
from app.enrollments.schemas import EnrollmentCreate
from sqlalchemy import select

async def main():
    try:
        print("Connecting to database...")
        async with AsyncSessionLocal() as db:
            # Let's find one employee
            res = await db.execute(select(Employee).limit(1))
            employee = res.scalar_one_or_none()
            if not employee:
                print("No employee found in database.")
                return

            # Let's find any training
            res_t = await db.execute(select(Training).limit(1))
            training = res_t.scalar_one_or_none()
            if not training:
                print("No training found in database.")
                return
            
            # Temporarily force global to skip department validations
            training.is_global = True
            await db.flush()

            print(f"Testing enrollment create for Employee: {employee.id}, Training: {training.id}...")
            
            # Delete any existing enrollment first to prevent already enrolled error
            from app.enrollments.models import EnrollmentStatus
            from sqlalchemy import delete
            await db.execute(delete(Enrollment).where(
                Enrollment.employee_id == employee.id,
                Enrollment.training_id == training.id
            ))
            await db.flush()

            payload = EnrollmentCreate(
                employee_id=employee.id,
                training_id=training.id
            )

            # Let's run create!
            e = await EnrollmentService.create(db, payload)
            print("Successfully created enrollment in database!")
            print(f"Enrollment ID: {e.id}")
            print(f"Status: {e.status}")
            
            # Rollback to avoid modifying database state
            await db.rollback()
            print("Successfully verified and rolled back transaction.")

    except Exception as ex:
        print("--- EXCEPTION CAUGHT ---")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

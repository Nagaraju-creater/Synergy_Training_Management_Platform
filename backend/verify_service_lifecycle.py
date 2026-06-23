import asyncio
from datetime import date, timedelta
from app.database import AsyncSessionLocal
from app.trainings.service import TrainingService
from app.trainings.schemas import TrainingCreate, TrainingUpdate
from app.trainings.models import Training, TrainingStatus
from app.trainings.categories import TrainingCategory
from app.utils.exceptions import BadRequestException
from sqlalchemy import select

# Import all models to prevent clsregistry map configuration issues in SQLAlchemy
from app.users.models import User
from app.roles.models import Role
from app.employees.models import Employee
from app.departments.models import Department, DepartmentHead
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

async def verify():
    async with AsyncSessionLocal() as db:
        # Find a user to assign as creator
        user_res = await db.execute(select(User).limit(1))
        user = user_res.scalar_one_or_none()
        if not user:
            print("No user found in database. Cannot run test.")
            return

        # Get or create a category
        cat_res = await db.execute(select(TrainingCategory).limit(1))
        category = cat_res.scalar_one_or_none()
        if not category:
            from app.trainings.schemas import TrainingCategoryCreate
            category = await TrainingService.create_category(db, TrainingCategoryCreate(
                name="Verification Tech",
                description="Technology used for verification testing"
            ))
            await db.commit()
            print(f"Created category: {category.name}")
        
        # 2. Create a training in the past
        past_date = date.today() - timedelta(days=5)
        payload = TrainingCreate(
            title="Past Training Session",
            description="A training that occurred in the past",
            category_id=category.id,
            start_date=past_date,
            start_time="09:00 AM",
            end_date=past_date,
            duration_hours=2.0,
            delivery_mode="ONLINE",  # Upper case enum value
            meeting_link="https://zoom.us/test",
            max_participants=10,
            is_global=True,
            is_mandatory=False,
            training_type="INTERNAL",  # Match Enum casing
            status=TrainingStatus.SCHEDULED  # Start as Scheduled
        )
        
        training = await TrainingService.create(db, payload, user.id)
        await db.commit()
        print(f"Created training: ID={training.id}, Title='{training.title}', Initial Status={training.status}")

        # 3. Call get_all and verify status sync and counts
        trainings, total, status_counts = await TrainingService.get_all(db, page=1, per_page=10, is_admin=True)
        print(f"Fetched trainings. Total count: {total}")
        print(f"Status Counts: {status_counts}")
        
        # Verify the status sync (should be COMPLETED because start/end is in the past)
        updated_training = next(t for t in trainings if t.id == training.id)
        print(f"Synced Status: {updated_training.status}")
        assert updated_training.status == TrainingStatus.COMPLETED, f"Expected status COMPLETED, got {updated_training.status}"
        assert status_counts["completed"] >= 1, "Expected completed count to be >= 1"

        # 4. Attempt to update and assert BadRequestException
        try:
            update_payload = TrainingUpdate(title="Modified Title")
            await TrainingService.update(db, training.id, update_payload)
            print("ERROR: Successfully updated completed training (should have failed)")
            assert False, "Updating completed training did not raise BadRequestException"
        except BadRequestException as e:
            print(f"Success: Update blocked with exception: {e.message}")

        # 5. Attempt to archive and assert BadRequestException
        try:
            await TrainingService.archive(db, training.id)
            print("ERROR: Successfully archived completed training (should have failed)")
            assert False, "Archiving completed training did not raise BadRequestException"
        except BadRequestException as e:
            print(f"Success: Archive blocked with exception: {e.message}")

        # 6. Delete completed training (should succeed)
        try:
            await TrainingService.delete(db, training.id)
            print("Success: Deleted completed training successfully.")
        except Exception as e:
            print(f"ERROR: Failed to delete completed training: {e}")
            assert False, f"Deleting completed training failed: {e}"

if __name__ == "__main__":
    asyncio.run(verify())

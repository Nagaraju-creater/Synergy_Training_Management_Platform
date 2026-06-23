import asyncio
import os
import shutil
from sqlalchemy import delete
from app.database import AsyncSessionLocal

# Import models to ensure they are registered and available
from app.users.models import User
from app.roles.models import Role
from app.employees.models import Employee
from app.departments.models import Department, DepartmentHead
from app.trainings.models import Training, TrainingImportHistory
from app.trainings.categories import TrainingCategory
from app.trainings.documents import TrainingDocument
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
from app.learning_hub.models import LearningCategory, LearningModule, LearningMaterial, Bookmark
from app.system_settings.models import SystemSetting

async def clear_training_data():
    async with AsyncSessionLocal() as session:
        print("Starting training data cleanup...")

        # List of models to clear, ordered to respect foreign key constraints
        models_to_delete = [
            Bookmark,
            LearningMaterial,
            LearningModule,
            LearningCategory,
            TrainingPlan,
            AnalyticsSnapshot,
            AuditLog,
            LeaderboardPoint,
            Achievement,
            Notification,
            AttendanceLog,
            AttendanceRecord,
            AttendanceSession,
            DepartmentReview,
            Effectiveness,
            Nomination,
            Enrollment,
            TrainingDocument,
            TrainingImportHistory,
            Training,
            TrainingCategory
        ]

        # Execute DELETE for each model
        for model in models_to_delete:
            table_name = model.__tablename__
            try:
                # Use begin_nested to safely catch exceptions per table if needed
                async with session.begin_nested():
                    await session.execute(delete(model))
                    print(f"Cleared all records from {table_name}")
            except Exception as e:
                print(f"Error clearing {table_name}: {e}")

        await session.commit()
        print("Database commit completed. All training-related records have been deleted.")

def clear_local_uploads():
    print("Starting local uploads cleanup...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    uploads_dir = os.path.join(base_dir, "uploads")
    
    # 1. Clear learning_materials files/folders
    learning_materials_dir = os.path.join(uploads_dir, "learning_materials")
    if os.path.exists(learning_materials_dir):
        for item in os.listdir(learning_materials_dir):
            item_path = os.path.join(learning_materials_dir, item)
            try:
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path)
                    print(f"Removed directory: {item_path}")
                else:
                    os.remove(item_path)
                    print(f"Removed file: {item_path}")
            except Exception as e:
                print(f"Error removing {item_path}: {e}")

    # 2. Clear trainings files/folders
    trainings_dir = os.path.join(uploads_dir, "trainings")
    if os.path.exists(trainings_dir):
        try:
            shutil.rmtree(trainings_dir)
            print(f"Removed trainings uploads directory: {trainings_dir}")
        except Exception as e:
            print(f"Error removing {trainings_dir}: {e}")

    print("Uploads cleanup completed.")

async def main():
    await clear_training_data()
    clear_local_uploads()

if __name__ == "__main__":
    asyncio.run(main())

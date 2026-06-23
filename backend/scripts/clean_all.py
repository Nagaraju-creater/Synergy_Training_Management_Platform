import asyncio
from sqlalchemy import delete
from app.database import AsyncSessionLocal
import app.models.registry
from app.database import AsyncSessionLocal

async def clean_all():
    async with AsyncSessionLocal() as db:
        print("清理数据库 (按顺序避免外键冲突)...")
        
        # Order: Child tables first (Reversed from ALL_MODELS usually works if defined correctly, 
        # but let's just use the explicit list from registry)
        from app.models.registry import ALL_MODELS
        
        # We need a specific order for cleanup to avoid FK violations.
        # Let's use the explicit list I had before but referencing from registry.
        from app.analytics.models import AnalyticsSnapshot
        from app.audit.models import AuditLog
        from app.gamification.models import Achievement, LeaderboardPoint
        from app.signatures.models import DigitalSignature
        from app.notifications.models import Notification
        from app.attendance.models import Attendance
        from app.effectiveness.reviews import DepartmentReview
        from app.effectiveness.models import Effectiveness
        from app.nominations.models import Nomination
        from app.enrollments.models import Enrollment
        from app.trainings.models import Training
        from app.departments.models import Department, DepartmentHead
        from app.employees.models import Employee
        from app.users.models import User
        from app.roles.models import Role
        
        # Order: Child tables first
        tables = [
            AnalyticsSnapshot,
            AuditLog,
            Achievement,
            LeaderboardPoint,
            DigitalSignature,
            Notification,
            Attendance,
            DepartmentReview,
            Effectiveness,
            Nomination,
            Enrollment,
            Training,
            DepartmentHead,
            Employee,
            Department,
            User,
            Role
        ]
        
        for table in tables:
            print(f"  - 清理 {table.__tablename__}...")
            await db.execute(delete(table))
        
        await db.commit()
        print("✅ 数据库清理完成。")

if __name__ == "__main__":
    asyncio.run(clean_all())

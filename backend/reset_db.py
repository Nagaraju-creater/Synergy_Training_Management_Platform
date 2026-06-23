import asyncio
from app.database import engine, Base
from sqlalchemy import text

async def main():
    print("Resetting database schema...")
    
    async with engine.begin() as conn:
        # Import all models to ensure they are registered with Base.metadata
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
        from app.attendance.models import Attendance
        from app.notifications.models import Notification
        from app.signatures.models import DigitalSignature
        from app.gamification.models import Achievement, LeaderboardPoint
        from app.audit.models import AuditLog
        from app.analytics.models import AnalyticsSnapshot
        
        print("Dropping schema 'public' and recreating it to handle circular dependencies...")
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
        
    print("Database schema reset successfully.")

if __name__ == "__main__":
    asyncio.run(main())

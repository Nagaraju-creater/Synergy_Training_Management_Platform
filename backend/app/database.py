from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def create_tables() -> None:
    """Create all tables (dev convenience — use Alembic for production)."""
    async with engine.begin() as conn:
        # Import all models so SQLAlchemy is aware of them before create_all
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
        from app.learning_hub.models import LearningCategory, LearningModule, LearningMaterial  # noqa: F401

        await conn.run_sync(Base.metadata.create_all, checkfirst=True)


async def get_db():
    """FastAPI dependency — yields an async session, commits only if dirty."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

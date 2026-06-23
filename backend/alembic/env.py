import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.database import Base

# Import all models so their tables are included in migrations
from app.users.models import User  # noqa: F401
from app.roles.models import Role  # noqa: F401
from app.employees.models import Employee  # noqa: F401
from app.departments.models import Department, DepartmentHead  # noqa: F401
from app.trainings.models import Training  # noqa: F401
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
from app.system_settings.models import SystemSetting  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

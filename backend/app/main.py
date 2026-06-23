from contextlib import asynccontextmanager
import os

# Import all models early to ensure SQLAlchemy mapper registry is complete
import app.models.registry  # noqa: F401

from fastapi import FastAPI, Request, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.analytics.router import router as analytics_router
from app.auth.router import router as auth_router
from app.departments.router import router as departments_router
from app.effectiveness.router import router as effectiveness_router
from app.employees.router import router as employees_router
from app.enrollments.router import router as enrollments_router
from app.middleware.logging_middleware import LoggingMiddleware
from app.nominations.router import router as nominations_router
from app.notifications.router import router as notifications_router
from app.attendance.router import router as attendance_router
from app.reports.router import router as reports_router
from app.trainings.router import router as trainings_router
from app.users.router import router as users_router
from app.training_plans.router import router as training_plans_router
from app.learning_hub.router import router as learning_hub_router
from app.system_settings.router import router as settings_router
from app.utils.exceptions import (
    AppException,
    app_exception_handler,
    integrity_error_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.utils.limiter import limiter
from app.config import settings
from app.database import create_tables, get_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle hooks."""
    if settings.DEBUG:
        await create_tables()
    # Ensure upload directories exist
    os.makedirs("uploads/avatars", exist_ok=True)
    os.makedirs("uploads/signatures", exist_ok=True)
    os.makedirs("uploads/learning_materials", exist_ok=True)
    # Seed default training categories if none exist
    await seed_default_categories()
    await seed_default_learning_categories()
    yield


async def seed_default_learning_categories() -> None:
    """Insert default learning categories if the table is empty."""
    from sqlalchemy import select, func
    from app.database import AsyncSessionLocal
    from app.learning_hub.models import LearningCategory

    default_categories = [
        ("Technical & Software", "Software engineering, coding, Python, and technology topics"),
        ("Tools & Productivity", "Advanced Excel, Word, PowerPoint, and daily productivity tools"),
        ("Quality & Compliance", "5S, ISO 9001, Quality control, SOPs, and standards compliance"),
        ("Security & IT Awareness", "Information security awareness, cybersecurity, and data protection"),
        ("Health, Safety & Environment", "Fire safety, emergency protocols, HSE, and safety awareness"),
        ("Leadership & Management", "Leadership development, communication, and team management"),
        ("Customer Service", "Customer service excellence, engagement, and relationship building"),
    ]

    async with AsyncSessionLocal() as db:
        try:
            count = (await db.execute(select(func.count(LearningCategory.id)))).scalar() or 0
            if count == 0:
                for name, description in default_categories:
                    db.add(LearningCategory(name=name, description=description))
                await db.commit()
        except Exception:
            await db.rollback()


async def seed_default_categories() -> None:
    """Insert default training categories if the table is empty."""
    from sqlalchemy import select, func
    from app.database import AsyncSessionLocal
    from app.trainings.categories import TrainingCategory

    default_categories = [
        ("Technical Skills", "Engineering, software, and IT-related training"),
        ("Leadership & Management", "Leadership development and managerial skills"),
        ("Compliance & Safety", "Regulatory compliance, HSE, and safety training"),
        ("Soft Skills", "Communication, teamwork, and interpersonal skills"),
        ("Sales & Customer Service", "Sales techniques and customer experience"),
        ("Finance & Accounting", "Financial literacy and accounting practices"),
        ("HR & People", "Human resources policies and people management"),
        ("Product & Domain", "Product knowledge and domain expertise"),
    ]

    async with AsyncSessionLocal() as db:
        try:
            count = (await db.execute(select(func.count(TrainingCategory.id)))).scalar() or 0
            if count == 0:
                for name, description in default_categories:
                    db.add(TrainingCategory(name=name, description=description))
                await db.commit()
        except Exception:
            await db.rollback()



import logging.config

logging_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "()": "uvicorn.logging.DefaultFormatter",
            "fmt": "%(levelprefix)s %(asctime)s [%(name)s] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
    },
    "loggers": {
        "training_platform": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

logging.config.dictConfig(logging_config)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Training Management and Learning Analytics Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    redirect_slashes=False,   # Prevents 307 redirects that strip CORS headers
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler) # type: ignore

# ── Middleware ─────────────────────────────────────────────────────────────────
# IMPORTANT: Starlette applies middleware in REVERSE registration order.
# The LAST middleware registered wraps outermost and runs first on every request.
# CORSMiddleware MUST be last so it is outermost — guaranteeing CORS headers
# are always injected, including on 500 error responses.

app.add_middleware(LoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ── Exception handlers ─────────────────────────────────────────────────────────
app.add_exception_handler(AppException, app_exception_handler) # type: ignore
app.add_exception_handler(RequestValidationError, validation_exception_handler) # type: ignore
app.add_exception_handler(IntegrityError, integrity_error_handler) # type: ignore
app.add_exception_handler(Exception, unhandled_exception_handler) # type: ignore  # must be last

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth_router,         prefix="/api/v1/auth",          tags=["Authentication"])
app.include_router(users_router,        prefix="/api/v1/users",         tags=["Users"])
app.include_router(employees_router,    prefix="/api/v1/employees",     tags=["Employees"])
app.include_router(departments_router,  prefix="/api/v1/departments",   tags=["Departments"])
app.include_router(trainings_router,    prefix="/api/v1/trainings",     tags=["Trainings"])
app.include_router(enrollments_router,  prefix="/api/v1/enrollments",   tags=["Enrollments"])
app.include_router(nominations_router,  prefix="/api/v1/nominations",   tags=["Nominations"])
app.include_router(effectiveness_router,prefix="/api/v1/effectiveness", tags=["Effectiveness"])
app.include_router(reports_router,      prefix="/api/v1/reports",       tags=["Reports"])
app.include_router(notifications_router,prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(analytics_router,    prefix="/api/v1/analytics",     tags=["Analytics"])
app.include_router(attendance_router,   prefix="/api/v1/attendance",    tags=["Attendance"])
app.include_router(training_plans_router, prefix="/api/v1/training-plans", tags=["Training Plans"])
app.include_router(learning_hub_router, prefix="/api/v1/learning-hub", tags=["Learning Hub"])
app.include_router(settings_router,     prefix="/api/v1/settings",      tags=["Settings"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": settings.PROJECT_NAME, "version": settings.VERSION}


@app.get("/health", tags=["Health"])
async def health(db = Depends(get_db)):
    from sqlalchemy import text
    import redis.asyncio as aioredis
    from fastapi.responses import JSONResponse
    from fastapi import status
    
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    redis_status = "ok"
    try:
        r = aioredis.from_url(settings.REDIS_URL, socket_timeout=2.0)
        await r.ping()
        await r.close()
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
        
    if db_status != "ok" or redis_status != "ok":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": db_status,
                "redis": redis_status
            }
        )
        
    return {
        "status": "healthy",
        "database": db_status,
        "redis": redis_status
    }

# Serve uploaded files (fallback for local development)
if not settings.SUPABASE_URL or settings.DEBUG:
    os.makedirs("uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# uvicorn reload trigger v3

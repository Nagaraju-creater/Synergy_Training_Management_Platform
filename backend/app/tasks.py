import asyncio
from app.services.celery_app import celery_app
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from datetime import date, timedelta
from app.database import AsyncSessionLocal
from app.enrollments.models import Enrollment, EnrollmentStatus
from app.trainings.models import Training
from app.notifications.service import NotificationService
from app.employees.models import Employee

def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@celery_app.task
def send_training_reminders():
    async def _send_reminders():
        async with AsyncSessionLocal() as db:
            # Find trainings starting tomorrow
            tomorrow = date.today() + timedelta(days=1)
            stmt = select(Training).where(Training.start_date == tomorrow)
            trainings = (await db.execute(stmt)).scalars().all()
            
            for t in trainings:
                # Get all enrolled employees
                enr_stmt = select(Enrollment).options(selectinload(Enrollment.employee)).where(and_(Enrollment.training_id == t.id, Enrollment.status == EnrollmentStatus.ENROLLED))
                enrollments = (await db.execute(enr_stmt)).scalars().all()
                
                for enr in enrollments:
                    if enr.employee and enr.employee.user_id:
                        await NotificationService.create(
                            db, 
                            enr.employee.user_id,
                            "Upcoming Training Reminder",
                            f"Reminder: Your training '{t.title}' starts tomorrow.",
                            "warning",
                            f"/trainings/{t.id}",
                            email_to=enr.employee.email
                        )
            await db.commit()
            
    run_async(_send_reminders())

@celery_app.task
def send_effectiveness_notification(enrollment_id: str):
    """
    Triggered 24 hours after a course attendance is marked completed (via roster).
    1. Auto-creates a PENDING Effectiveness record with a 2-day submission deadline.
    2. Sends an in-app notification to the employee.
    Skips creation if a record already exists for this enrollment.
    """
    async def _send():
        from sqlalchemy.orm import selectinload
        from datetime import datetime, timezone
        from app.effectiveness.models import Effectiveness, EffectivenessLevel, EffectivenessStatus

        async with AsyncSessionLocal() as db:
            # Load enrollment with related employee and training
            stmt = select(Enrollment).options(
                selectinload(Enrollment.employee),
                selectinload(Enrollment.training)
            ).where(Enrollment.id == enrollment_id)

            res = await db.execute(stmt)
            enr = res.scalar_one_or_none()

            if not enr or enr.status != EnrollmentStatus.COMPLETED:
                return  # Skip if not found or not completed

            # Check if an effectiveness record already exists for this enrollment
            existing_stmt = select(Effectiveness).where(Effectiveness.enrollment_id == enr.id)
            existing = (await db.execute(existing_stmt)).scalar_one_or_none()

            if not existing:
                # Auto-create PENDING effectiveness record with 2-day deadline from now
                now = datetime.now(timezone.utc)
                deadline = now + timedelta(days=2)

                effectiveness = Effectiveness(
                    enrollment_id=enr.id,
                    training_id=enr.training_id,
                    level=EffectivenessLevel.REACTION,      # Level 1 – participant reaction
                    status=EffectivenessStatus.PENDING,
                    evaluated_by=enr.employee.user_id if enr.employee else None,
                    submission_deadline=deadline,
                )
                db.add(effectiveness)
                await db.flush()

            # Send notification to employee
            if enr.employee and enr.employee.user_id:
                training_title = enr.training.title if enr.training else "your recent training"
                await NotificationService.create(
                    db,
                    enr.employee.user_id,
                    "Effectiveness Feedback Required",
                    f"You have 2 days to complete the effectiveness assessment for '{training_title}'. Share your learning impact now!",
                    "info",
                    "/effectiveness",
                    email_to=enr.employee.email
                )

            await db.commit()

    run_async(_send())


@celery_app.task
def escalate_pending_reviews():
    async def _escalate():
        async with AsyncSessionLocal() as db:
            # Find effectiveness forms pending for more than 5 days
            five_days_ago = date.today() - timedelta(days=5)
            # Dummy logic: find effectiveness records submitted > 5 days ago
            pass # Implementation details depends on models
            
    run_async(_escalate())

@celery_app.task
def process_monthly_summary():
    # Generate and send monthly summary to admins
    pass

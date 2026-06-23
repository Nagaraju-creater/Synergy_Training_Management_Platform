from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.effectiveness.models import Effectiveness, EffectivenessStatus
from app.enrollments.models import Enrollment
from app.employees.models import Employee


async def send_effectiveness_reminders():
    """
    Runs hourly. For each PENDING effectiveness record:
    - Syncs overdue status (deadline passed → OVERDUE).
    - Sends a 24-hour reminder if remaining time ≤ 24h and is_24h_reminder_sent is False.
    - Sends a 6-hour reminder if remaining time ≤ 6h and is_6h_reminder_sent is False.
    """
    from app.utils.email import send_email
    from app.utils.email_templates import build_effectiveness_reminder_email_html
    from app.config import settings

    async for db in get_db():
        now = datetime.now(timezone.utc)

        stmt = (
            select(Effectiveness)
            .where(Effectiveness.status == EffectivenessStatus.PENDING)
            .options(
                selectinload(Effectiveness.enrollment).selectinload(Enrollment.employee),
                selectinload(Effectiveness.training),
            )
        )
        res = await db.execute(stmt)
        pending_records = res.scalars().all()

        for eff in pending_records:
            if not eff.submission_deadline:
                continue

            # Sync overdue
            if now > eff.submission_deadline:
                eff.status = EffectivenessStatus.OVERDUE
                await db.flush()
                continue

            # Get employee from enrollment
            enrollment = eff.enrollment
            if not enrollment or not enrollment.employee:
                continue

            employee = enrollment.employee
            if not employee.email:
                continue

            training = eff.training
            training_name = training.title if training else "Training Program"

            # Calculate remaining hours
            remaining_delta = eff.submission_deadline - now
            remaining_hours = remaining_delta.total_seconds() / 3600

            due_str = eff.submission_deadline.strftime("%B %d, %Y at %I:%M %p UTC")

            frontend_url = settings.FRONTEND_URL
            action_url = f"{frontend_url}/effectiveness"
            emp_name = f"{employee.first_name} {employee.last_name}"

            # 24-hour reminder
            if remaining_hours <= 24 and not eff.is_24h_reminder_sent:
                try:
                    html_body = build_effectiveness_reminder_email_html(
                        employee_name=emp_name,
                        training_name=training_name,
                        due_datetime_str=due_str,
                        remaining_label="24 hours",
                        action_url=action_url,
                    )
                    await send_email(
                        employee.email,
                        f"⏰ Reminder: Effectiveness Assessment Due in 24 Hours – {training_name}",
                        html_body,
                    )
                    eff.is_24h_reminder_sent = True
                    await db.flush()
                except Exception:
                    pass

            # 6-hour reminder
            if remaining_hours <= 6 and not eff.is_6h_reminder_sent:
                try:
                    html_body = build_effectiveness_reminder_email_html(
                        employee_name=emp_name,
                        training_name=training_name,
                        due_datetime_str=due_str,
                        remaining_label="6 hours",
                        action_url=action_url,
                    )
                    await send_email(
                        employee.email,
                        f"🚨 Urgent: Effectiveness Assessment Due in 6 Hours – {training_name}",
                        html_body,
                    )
                    eff.is_6h_reminder_sent = True
                    await db.flush()
                except Exception:
                    pass

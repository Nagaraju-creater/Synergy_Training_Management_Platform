from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import selectinload

from app.effectiveness.models import Effectiveness, EffectivenessStatus, EffectivenessLevel
from app.effectiveness.schemas import (
    EffectivenessCreate,
    EffectivenessReview,
    EffectivenessUpdate,
)
from app.notifications.service import NotificationService
from app.notifications.schemas import NotificationCreate
from app.utils.exceptions import AppException, NotFoundException
from app.utils.pagination import paginate
from app.enrollments.service import EnrollmentService


class EffectivenessService:

    @staticmethod
    async def sync_overdue_records(db: AsyncSession) -> None:
        """
        Scans PENDING effectiveness records whose submission_deadline has passed
        and transitions them to OVERDUE. Called on every list/stats query for
        real-time accuracy.
        """
        now = datetime.now(timezone.utc)
        stmt = select(Effectiveness).where(
            Effectiveness.status == EffectivenessStatus.PENDING,
            Effectiveness.submission_deadline != None,
            Effectiveness.submission_deadline < now,
        )
        res = await db.execute(stmt)
        overdue_records = res.scalars().all()
        for rec in overdue_records:
            rec.status = EffectivenessStatus.OVERDUE
        if overdue_records:
            await db.flush()

    @staticmethod
    async def assign_training_effectiveness(db: AsyncSession, training) -> None:
        """
        Called when a training transitions to COMPLETED.
        - Queries AttendanceRecord for PRESENT employees.
        - Creates a PENDING Effectiveness record for each (if not already existing).
        - Sets completion_datetime = now, submission_deadline = now + 48 hours.
        - Sends an email notification to each eligible employee.
        """
        from app.attendance.models import AttendanceRecord, AttendanceStatus
        from app.enrollments.models import Enrollment, EnrollmentStatus
        from app.employees.models import Employee
        from app.config import settings

        now = datetime.now(timezone.utc)
        deadline = now + timedelta(hours=48)

        # Find all attendance records for this training where status == PRESENT or LATE
        att_stmt = (
            select(AttendanceRecord)
            .where(
                AttendanceRecord.training_id == training.id,
                AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
            )
            .options(selectinload(AttendanceRecord.employee))
        )
        att_res = await db.execute(att_stmt)
        attendance_records = att_res.scalars().all()

        if not attendance_records:
            return

        # For each present employee, find their enrollment and create effectiveness record
        for att in attendance_records:
            employee = att.employee
            if not employee:
                continue

            # Find the enrollment for this employee + training
            enr_stmt = select(Enrollment).where(
                Enrollment.employee_id == employee.id,
                Enrollment.training_id == training.id,
                Enrollment.status.in_([EnrollmentStatus.APPROVED, EnrollmentStatus.COMPLETED]),
            )
            enr_res = await db.execute(enr_stmt)
            enrollment = enr_res.scalar_one_or_none()

            if not enrollment:
                # Fallback: search for any non-withdrawn enrollment
                enr_stmt_any = select(Enrollment).where(
                    Enrollment.employee_id == employee.id,
                    Enrollment.training_id == training.id,
                    Enrollment.status.notin_([EnrollmentStatus.WITHDRAWN]),
                )
                enr_res2 = await db.execute(enr_stmt_any)
                enrollment = enr_res2.scalar_one_or_none()

            if not enrollment:
                continue

            # ── Complete the enrollment (idempotent) ──────────────────────────
            if enrollment.status != EnrollmentStatus.COMPLETED:
                enrollment.status = EnrollmentStatus.COMPLETED
                enrollment.progress = 100.0
                await db.flush()

                # Award gamification points (non-blocking)
                try:
                    from app.gamification.service import GamificationService
                    await GamificationService.award_points(
                        db, enrollment.employee_id, 50,
                        f"Completed training: {getattr(training, 'title', 'Training')}"
                    )
                except Exception:
                    pass

            # Check if an effectiveness record already exists for this enrollment
            existing_stmt = select(Effectiveness).where(
                Effectiveness.enrollment_id == enrollment.id,
            )
            existing_res = await db.execute(existing_stmt)
            existing = existing_res.scalar_one_or_none()

            if existing:
                # If existing record, update completion_datetime and deadline if not already set
                if not existing.completion_datetime:
                    existing.completion_datetime = now
                    existing.submission_deadline = deadline
                    await db.flush()
                continue

            # Create a new PENDING effectiveness record
            eff = Effectiveness(
                enrollment_id=enrollment.id,
                training_id=training.id,
                level=EffectivenessLevel.REACTION,
                status=EffectivenessStatus.PENDING,
                completion_datetime=now,
                submission_deadline=deadline,
            )
            db.add(eff)
            await db.flush()

            # Send email notification
            if employee.user_id and employee.email:
                try:
                    from app.utils.email_templates import build_effectiveness_assessment_email_html
                    frontend_url = settings.FRONTEND_URL
                    action_url = f"{frontend_url}/effectiveness"
                    training_date_str = (
                        training.start_date.strftime("%B %d, %Y")
                        if training.start_date
                        else "N/A"
                    )
                    due_str = deadline.strftime("%B %d, %Y at %I:%M %p UTC")

                    email_html = build_effectiveness_assessment_email_html(
                        employee_name=f"{employee.first_name} {employee.last_name}",
                        training_name=training.title,
                        training_date=training_date_str,
                        trainer_name=getattr(training, "trainer_name", None),
                        due_datetime_str=due_str,
                        action_url=action_url,
                    )

                    await NotificationService.create(
                        db,
                        employee.user_id,
                        "Training Effectiveness Assessment",
                        f"Please complete your effectiveness assessment for '{training.title}' within 48 hours.",
                        "warning",
                        "/effectiveness",
                        email_to=employee.email,
                        email_subject=f"Action Required: Effectiveness Assessment – {training.title} | Synergy Training Platform",
                        email_body=email_html,
                    )
                except Exception:
                    pass  # Don't fail the whole assignment if email fails

    @staticmethod
    async def get_all(db: AsyncSession, current_user, page: int = 1, per_page: int = 20, filters: dict = None):
        from app.enrollments.models import Enrollment
        from app.employees.models import Employee
        from app.utils.pagination import paginate_query

        # Sync overdue records on every list query
        await EffectivenessService.sync_overdue_records(db)

        user_role = current_user.role.name.lower() if current_user.role else ""
        emp_id = current_user.employee_id

        stmt = select(Effectiveness).join(Enrollment).join(Employee)

        # --- Scoping ---
        if user_role == "admin":
            pass
        elif user_role == "manager":
            stmt = stmt.where(
                or_(
                    Employee.manager_id == emp_id,
                    Enrollment.employee_id == emp_id
                )
            )
        else:
            stmt = stmt.where(Enrollment.employee_id == emp_id)

        # --- Filters ---
        if filters:
            if filters.get("status"):
                stmt = stmt.where(Effectiveness.status == filters["status"])
            if filters.get("training_id"):
                stmt = stmt.where(Effectiveness.training_id == filters["training_id"])
            if filters.get("department_id"):
                stmt = stmt.where(Employee.department_id == filters["department_id"])
            if filters.get("employee_id"):
                stmt = stmt.where(Enrollment.employee_id == filters["employee_id"])

        # Eager load relationships
        stmt = stmt.options(
            selectinload(Effectiveness.enrollment).selectinload(Enrollment.training),
            selectinload(Effectiveness.training)
        )

        return await paginate_query(db, stmt, page, per_page)

    @staticmethod
    async def get_stats(db: AsyncSession) -> dict:
        """
        Returns admin KPI metrics for the effectiveness dashboard.
        Syncs overdue records before computing stats.
        """
        await EffectivenessService.sync_overdue_records(db)

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Count by status
        status_stmt = select(Effectiveness.status, func.count(Effectiveness.id)).group_by(Effectiveness.status)
        status_res = await db.execute(status_stmt)
        counts = {row[0]: row[1] for row in status_res.all()}

        total_pending = counts.get(EffectivenessStatus.PENDING, 0)
        total_submitted = counts.get(EffectivenessStatus.SUBMITTED, 0)
        total_reviewed = counts.get(EffectivenessStatus.REVIEWED, 0)
        total_overdue = counts.get(EffectivenessStatus.OVERDUE, 0)
        total_all = sum(counts.values())

        # Due today: pending records with deadline today
        due_today_stmt = select(func.count(Effectiveness.id)).where(
            Effectiveness.status == EffectivenessStatus.PENDING,
            Effectiveness.submission_deadline >= today_start,
            Effectiveness.submission_deadline <= today_end,
        )
        due_today_res = await db.execute(due_today_stmt)
        due_today = due_today_res.scalar() or 0

        completion_pct = round(
            ((total_submitted + total_reviewed) / total_all * 100) if total_all > 0 else 0,
            1
        )

        return {
            "total_pending": total_pending,
            "total_submitted": total_submitted,
            "total_reviewed": total_reviewed,
            "total_overdue": total_overdue,
            "due_today": due_today,
            "completion_percentage": completion_pct,
            "total": total_all,
        }

    @staticmethod
    async def get_by_id(db: AsyncSession, eff_id: UUID) -> Effectiveness:
        stmt = (
            select(Effectiveness)
            .options(selectinload(Effectiveness.training))
            .where(Effectiveness.id == eff_id)
        )
        res = await db.execute(stmt)
        e = res.scalar_one_or_none()
        if not e:
            raise NotFoundException("Effectiveness record")
        return e

    @staticmethod
    async def create(
        db: AsyncSession, payload: EffectivenessCreate, evaluated_by: UUID
    ) -> Effectiveness:
        from app.enrollments.models import Enrollment
        from app.employees.models import Employee
        from app.attendance.models import AttendanceRecord, AttendanceStatus
        from sqlalchemy.orm import selectinload

        # Fetch enrollment with training details
        stmt = select(Enrollment).where(Enrollment.id == payload.enrollment_id).options(selectinload(Enrollment.training))
        res = await db.execute(stmt)
        enrollment = res.scalar_one_or_none()

        if not enrollment:
             raise NotFoundException("Enrollment")

        # Verify employee was present at training
        att_stmt = select(AttendanceRecord).where(
            AttendanceRecord.employee_id == enrollment.employee_id,
            AttendanceRecord.training_id == enrollment.training_id,
            AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
        )
        att_res = await db.execute(att_stmt)
        was_present = att_res.scalar_one_or_none()

        if not was_present:
            raise AppException("Only employees who attended the training can submit an effectiveness evaluation")

        # Check for duplicate submissions
        dup_stmt = select(Effectiveness).where(
            Effectiveness.enrollment_id == payload.enrollment_id,
            Effectiveness.status.in_([EffectivenessStatus.SUBMITTED, EffectivenessStatus.REVIEWED]),
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            raise AppException("An effectiveness evaluation has already been submitted for this enrollment")

        # Check submission deadline (48h)
        existing_stmt = select(Effectiveness).where(
            Effectiveness.enrollment_id == payload.enrollment_id,
            Effectiveness.status == EffectivenessStatus.PENDING,
        )
        existing_res = await db.execute(existing_stmt)
        existing_pending = existing_res.scalar_one_or_none()

        if existing_pending and existing_pending.submission_deadline:
            now = datetime.now(timezone.utc)
            if now > existing_pending.submission_deadline:
                raise AppException("The 48-hour submission window for this assessment has expired")

        e = Effectiveness(
            **payload.model_dump(),
            evaluated_by=evaluated_by,
            status=EffectivenessStatus.SUBMITTED
        )

        db.add(e)
        await db.flush()
        await db.refresh(e, ["id", "created_at", "updated_at"])

        # Notify Manager
        emp_stmt = select(Employee).where(Employee.id == enrollment.employee_id)
        emp_res = await db.execute(emp_stmt)
        employee = emp_res.scalar_one_or_none()

        if employee and employee.manager_id:
            mgr_stmt = select(Employee).where(Employee.id == employee.manager_id)
            mgr_res = await db.execute(mgr_stmt)
            manager = mgr_res.scalar_one_or_none()

            if manager and manager.user_id:
                await NotificationService.create(
                    db,
                    manager.user_id,
                    "Training Effectiveness Submission",
                    f"{employee.first_name} {employee.last_name} has submitted an evaluation for {enrollment.training.title}.",
                    "info",
                    "/effectiveness",
                    email_to=manager.email
                )

        return await EffectivenessService.get_by_id(db, e.id)

    @staticmethod
    async def review(
        db: AsyncSession, eff_id: UUID, payload: EffectivenessReview, reviewed_by: UUID
    ) -> Effectiveness:
        e = await EffectivenessService.get_by_id(db, eff_id)
        if e.status != EffectivenessStatus.SUBMITTED:
            raise AppException("Only submitted forms can be reviewed")

        for k, v in payload.model_dump(exclude_none=True).items():
            setattr(e, k, v)

        e.reviewed_by = reviewed_by
        e.reviewed_at = datetime.now(timezone.utc)

        await db.flush()
        return await EffectivenessService.get_by_id(db, e.id)

    @staticmethod
    async def update(
        db: AsyncSession, eff_id: UUID, payload: EffectivenessUpdate
    ) -> Effectiveness:
        e = await EffectivenessService.get_by_id(db, eff_id)

        # Prevent editing after review
        if e.status == EffectivenessStatus.REVIEWED:
            raise AppException("Cannot edit a reviewed form")

        # Prevent editing after submission (employees only – admins bypass this in router)
        if e.status == EffectivenessStatus.SUBMITTED:
            raise AppException("Cannot edit an already-submitted form. Contact your manager for assistance.")

        # Check deadline for PENDING records
        if e.status == EffectivenessStatus.PENDING and e.submission_deadline:
            now = datetime.now(timezone.utc)
            if now > e.submission_deadline:
                raise AppException("The 48-hour submission window for this assessment has expired")

        for k, v in payload.model_dump(exclude_none=True).items():
            setattr(e, k, v)

        # Auto-transition: if employee is filling in their responses, mark as submitted
        if e.status == EffectivenessStatus.PENDING:
            has_content = bool(
                payload.learnings_summary or
                payload.work_application or
                payload.rating
            )
            if has_content:
                e.status = EffectivenessStatus.SUBMITTED

        await db.flush()
        return await EffectivenessService.get_by_id(db, e.id)

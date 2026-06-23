from typing import List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, or_, and_
from datetime import date, datetime, timedelta, timezone, time
import logging

logger = logging.getLogger(__name__)

from app.enrollments.models import Enrollment, EnrollmentStatus
from app.trainings.models import Training
from app.enrollments.schemas import EnrollmentCreate, EnrollmentUpdate
from app.utils.exceptions import NotFoundException, BadRequestException
from app.utils.pagination import paginate


class EnrollmentService:
    @staticmethod
    async def get_all(
        db: AsyncSession, 
        page: int, 
        per_page: int, 
        current_user, 
        training_id: str = None, 
        employee_id: UUID = None,
        status: str = None
    ) -> Tuple[List[Enrollment], int]:
        from app.employees.models import Employee
        from app.utils.pagination import paginate_query

        user_role = current_user.role.name.lower() if hasattr(current_user.role, 'name') else str(current_user.role).lower()
        
        stmt = select(Enrollment).options(
            selectinload(Enrollment.employee).selectinload(Employee.department),
            selectinload(Enrollment.employee).selectinload(Employee.manager),
            selectinload(Enrollment.training)
        )

        # Role-based scoping — use subqueries to avoid join conflicts with selectinload
        if user_role == "admin":
            pass
        elif user_role == "manager":
            emp = getattr(current_user, "employee", None)
            emp_id = emp.id if emp else None
            
            if not emp_id:
                stmt = stmt.where(False)  # Return no results if manager has no employee profile
            else:
                # Subquery: get employee IDs in this manager's team (or the manager themselves)
                from sqlalchemy import select as sa_select
                team_ids_query = sa_select(Employee.id).where(
                    or_(
                        Employee.manager_id == emp_id,
                        Employee.id == emp_id
                    )
                )
                stmt = stmt.where(Enrollment.employee_id.in_(team_ids_query))
        else:
            emp = getattr(current_user, "employee", None)
            emp_id = emp.id if emp else None
            stmt = stmt.where(Enrollment.employee_id == emp_id)

        # Filters
        if training_id:
            stmt = stmt.where(Enrollment.training_id == training_id)
            
        if employee_id:
            stmt = stmt.where(Enrollment.employee_id == employee_id)

        if status:
            stmt = stmt.where(Enrollment.status == status.lower())
            
            # --- User Requirement: 24-hour delay for effectiveness visibility ---
            # If an employee is looking for COMPLETED trainings (for evaluation),
            # only show them if they were completed more than 24 hours ago.
            if status.lower() == EnrollmentStatus.COMPLETED and user_role == "employee":
                yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
                stmt = stmt.where(Enrollment.updated_at <= yesterday)

        stmt = stmt.order_by(Enrollment.updated_at.desc())
        items, total = await paginate_query(db, stmt, page, per_page)
        return items, total

    @staticmethod
    async def get_by_id(db: AsyncSession, enrollment_id: UUID) -> Enrollment:
        stmt = select(Enrollment).options(
            selectinload(Enrollment.employee),
            selectinload(Enrollment.training).selectinload(Training.category),
            selectinload(Enrollment.training).selectinload(Training.creator)
        ).where(Enrollment.id == enrollment_id)
        
        result = await db.execute(stmt)
        e = result.scalar_one_or_none()
        if not e:
            raise NotFoundException("Enrollment")
            
        return e

    @staticmethod
    async def create(db: AsyncSession, payload: EnrollmentCreate) -> Enrollment:
        stmt = select(Training).options(selectinload(Training.departments)).where(Training.id == payload.training_id)
        training = (await db.execute(stmt)).scalar_one_or_none()
        if not training:
            raise NotFoundException("Training")

        from app.employees.models import Employee
        employee = await db.get(Employee, payload.employee_id)
        if not employee:
            raise NotFoundException("Employee")

        if not training.is_global:
            training_dept_ids = {d.id for d in training.departments}
            if employee.department_id not in training_dept_ids:
                raise BadRequestException("Employee is not eligible for this training based on department")

        if training.enrollment_deadline:
            deadline = training.enrollment_deadline
            # Handle case where it might be a date object (due to DB schema mismatch)
            if isinstance(deadline, date) and not isinstance(deadline, datetime):
                from datetime import time as dt_time
                deadline = datetime.combine(deadline, dt_time(23, 59, 59))

            now = datetime.now()
            logger.info(
                "[enrollment-check] Training '%s' | deadline=%s | now=%s | deadline_passed=%s",
                training.title, deadline, now, deadline < now
            )

            if deadline < now:
                logger.warning(
                    "[enrollment-check] BLOCKED: deadline %s < now %s for training '%s'",
                    deadline, now, training.title
                )
                raise BadRequestException("Enrollment deadline has passed")

        if training.available_seats is not None and training.available_seats <= 0:
            raise BadRequestException("No seats available for this training")

        stmt = select(Enrollment).where(
            Enrollment.employee_id == payload.employee_id,
            Enrollment.training_id == payload.training_id,
            Enrollment.status != EnrollmentStatus.WITHDRAWN
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise BadRequestException("Employee is already enrolled in this training")
            
        e = Enrollment(**payload.model_dump())
        e.status = EnrollmentStatus.APPROVED
        
        if training.available_seats is not None:
            training.available_seats -= 1
            
        db.add(e)
        await db.flush()
        await db.refresh(e, ["id", "created_at", "updated_at"])
        
        from app.notifications.service import NotificationService
        full_enrollment = await EnrollmentService.get_by_id(db, e.id)
        if full_enrollment.employee and full_enrollment.employee.user_id:
            from app.config import settings
            from app.utils.email_templates import build_enrollment_confirmation_html

            emp_name = f"{full_enrollment.employee.first_name} {full_enrollment.employee.last_name}"
            trn = full_enrollment.training
            
            # Program date formatted
            program_date_str = trn.start_date.strftime("%B %d, %Y") if trn.start_date else "N/A"
            
            # Calculate end time based on start_time and duration
            start_time_str = trn.start_time or "N/A"
            end_time_str = "N/A"
            if trn.start_date and trn.start_time:
                try:
                    t = datetime.strptime(trn.start_time, "%I:%M %p").time()
                    start_dt = datetime.combine(trn.start_date, t)
                    duration = trn.duration_hours or 2.0
                    end_dt = start_dt + timedelta(hours=duration)
                    end_time_str = end_dt.strftime("%I:%M %p")
                except Exception:
                    pass

            # Determine category name
            cat_name = trn.category.name if trn.category and trn.category.name else "General"
            
            # Contact email (creator's email or fallback L&D support)
            contact_email = "ld@synergy.com"
            if trn.creator and hasattr(trn.creator, 'email') and trn.creator.email:
                contact_email = trn.creator.email

            # Absolute action URL
            frontend_url = settings.FRONTEND_URL
            action_url = f"{frontend_url}/trainings/{trn.id}"

            # Build HTML body
            email_body = build_enrollment_confirmation_html(
                employee_name=emp_name,
                training_name=trn.title,
                category_name=cat_name,
                program_date=program_date_str,
                start_time=start_time_str,
                end_time=end_time_str,
                duration_hours=trn.duration_hours or 2.0,
                trainer_name=trn.trainer_name,
                venue=trn.venue,
                meeting_link=trn.meeting_link,
                training_id=str(trn.id),
                action_url=action_url,
                contact_email=contact_email
            )
            
            email_subject = f"Enrollment Confirmed – {trn.title} | Synergy Training Platform"

            await NotificationService.create(
                db, 
                full_enrollment.employee.user_id,
                "Enrollment Confirmed",
                f"You have been successfully enrolled in '{trn.title}'.",
                "success",
                f"/trainings/{trn.id}",
                email_to=full_enrollment.employee.email,
                email_subject=email_subject,
                email_body=email_body
            )

        return full_enrollment

    @staticmethod
    async def update(
        db: AsyncSession, enrollment_id: UUID, payload: EnrollmentUpdate
    ) -> Enrollment:
        e = await EnrollmentService.get_by_id(db, enrollment_id)
        
        data = payload.model_dump(exclude_none=True)
        if "status" in data:
            old_status = e.status
            new_status = data["status"]
            
            if new_status == EnrollmentStatus.APPROVED and old_status != EnrollmentStatus.APPROVED:
                training = await db.get(Training, e.training_id)
                if training.available_seats is not None:
                    if training.available_seats <= 0:
                        raise BadRequestException("No seats available for this training")
                    training.available_seats -= 1
            
            if old_status == EnrollmentStatus.APPROVED and new_status in [EnrollmentStatus.WITHDRAWN, EnrollmentStatus.REJECTED]:
                training = await db.get(Training, e.training_id)
                if training.available_seats is not None:
                    training.available_seats += 1

        for k, v in data.items():
            setattr(e, k, v)
            
        if "status" in data and data["status"] == EnrollmentStatus.COMPLETED:
            from app.gamification.service import GamificationService
            await GamificationService.award_points(db, e.employee_id, 50, f"Completed training: {e.training.title}")
            
            # Effectiveness assignment is handled by the training-level COMPLETED hook
            # in trainings/service.py → EffectivenessService.assign_training_effectiveness.
            # No Celery call needed here (avoids ModuleNotFoundError when Redis unavailable).
            
        await db.flush()
        await db.refresh(e, ["updated_at"])
            
        return e

    @staticmethod
    async def withdraw(db: AsyncSession, enrollment_id: UUID, reason: str) -> Enrollment:
        e = await EnrollmentService.get_by_id(db, enrollment_id)

        if e.status == EnrollmentStatus.WITHDRAWN:
            raise BadRequestException("This enrollment has already been withdrawn")

        if e.status == EnrollmentStatus.COMPLETED:
            raise BadRequestException("Cannot withdraw from a completed training")

        training = await db.get(Training, e.training_id)

        if training and training.start_date and training.start_date <= date.today():
            raise BadRequestException(
                "Withdrawal is not allowed after the training start date. "
                f"This training started on {training.start_date.strftime('%B %d, %Y')}."
            )

        reason = reason.strip() if reason else ""
        if not reason:
            raise BadRequestException("A withdrawal reason is required")

        if e.status == EnrollmentStatus.APPROVED:
            if training and training.available_seats is not None:
                training.available_seats += 1

        e.status = EnrollmentStatus.WITHDRAWN
        e.withdrawal_reason = reason
        await db.flush()
        await db.refresh(e, ["updated_at"])

        return e

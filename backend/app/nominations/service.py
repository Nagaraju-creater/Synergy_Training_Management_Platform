from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.nominations.models import Nomination, NominationStatus
from app.nominations.schemas import (
    NominationCreate, 
    NominationUpdate
)
from app.utils.exceptions import NotFoundException, BadRequestException
from app.utils.pagination import paginate
from app.trainings.models import Training, TrainingStatus


class NominationService:

    # ── Internal helpers ───────────────────────────────────────────────────────

    @staticmethod
    async def _find_manager_employee_id(db: AsyncSession, employee_id: UUID):
        """
        Returns the employee_id of the direct manager for the given employee_id.
        Priority:
          1. Employee.manager_id
          2. Department.head_id
          3. None if not found
        """
        from app.employees.models import Employee
        from app.departments.models import Department

        emp_res = await db.execute(select(Employee).where(Employee.id == employee_id))
        employee = emp_res.scalar_one_or_none()
        if not employee:
            return None

        # 1. Direct manager via manager_id
        if employee.manager_id:
            return employee.manager_id

        # 2. Department head
        if employee.department_id:
            dept_res = await db.execute(
                select(Department).where(Department.id == employee.department_id)
            )
            dept = dept_res.scalar_one_or_none()
            if dept and dept.head_id and dept.head_id != employee_id:
                return dept.head_id

        return None

    @staticmethod
    async def _get_admin_user_ids(db: AsyncSession) -> list:
        """Returns a list of user_ids for all users with the 'admin' role."""
        from app.users.models import User
        from app.roles.models import Role
        result = await db.execute(
            select(User.id).join(Role, User.role_id == Role.id).where(Role.name == "admin")
        )
        return [row[0] for row in result.all()]

    @staticmethod
    async def _notify(db: AsyncSession, user_id, title: str, message: str, action_url: str = "/nominations"):
        """Fire-and-forget in-app notification. Silently skips if user_id is None."""
        if not user_id:
            return
        try:
            from app.notifications.service import NotificationService
            await NotificationService.create(
                db, user_id=user_id,
                title=title, message=message,
                notification_type="info", action_url=action_url,
            )
        except Exception:
            pass  # Never let a notification failure break the main flow

    # ── Public API ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_all(db: AsyncSession, page: int, per_page: int, current_user):
        """Admin-only: returns every nomination. Raises 403 for non-admins."""
        from sqlalchemy import select
        from app.employees.models import Employee
        from app.utils.pagination import paginate_query
        from fastapi import HTTPException

        user_role = current_user.role.name.lower() if current_user.role else ""
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        stmt = (
            select(Nomination)
            .options(
                selectinload(Nomination.training),
                selectinload(Nomination.employee).selectinload(Employee.department),
                selectinload(Nomination.nominator),
            )
            .order_by(Nomination.created_at.desc())
        )

        items, total = await paginate_query(db, stmt, page, per_page)
        for item in items:
            item.training_title = item.training.title if item.training else None
            item.employee_name = (
                f"{item.employee.first_name} {item.employee.last_name}" if item.employee else None
            )
            item.nominator_name = item.nominator.full_name if item.nominator else "System"
        return items, total

    # ── Strict employee-scoped: GET /nominations/my ────────────────────────────

    @staticmethod
    async def get_my(db: AsyncSession, page: int, per_page: int, current_user):
        """
        Returns ONLY nominations where employee_id == current_user's employee record.
        No joins, no ORs, no role-based widening. Strictly the caller's own nominations.
        """
        from sqlalchemy import select
        from app.employees.models import Employee
        from app.utils.pagination import paginate_query

        # Use the employee_id attached to current_user
        emp_id = getattr(current_user, "employee_id", None)

        if not emp_id:
            return [], 0

        stmt = (
            select(Nomination)
            .options(
                selectinload(Nomination.training),
                selectinload(Nomination.employee),
                selectinload(Nomination.nominator),
            )
            .where(Nomination.employee_id == emp_id)   # ← strict: only MY nominations
            .order_by(Nomination.created_at.desc())
        )

        items, total = await paginate_query(db, stmt, page, per_page)
        for item in items:
            item.training_title = item.training.title if item.training else None
            item.employee_name = (
                f"{item.employee.first_name} {item.employee.last_name}" if item.employee else None
            )
            item.nominator_name = item.nominator.full_name if item.nominator else "System"
        return items, total

    # ── Strict manager-scoped: GET /nominations/team ───────────────────────────

    @staticmethod
    async def get_team(db: AsyncSession, page: int, per_page: int, current_user):
        """
        Returns ONLY nominations where manager_id == current_user.id.
        The manager_id is set at creation time so no join heuristics are needed.
        """
        from sqlalchemy import select
        from app.employees.models import Employee
        from app.utils.pagination import paginate_query

        stmt = (
            select(Nomination)
            .options(
                selectinload(Nomination.training),
                selectinload(Nomination.employee),
                selectinload(Nomination.nominator),
            )
            .where(Nomination.manager_id == current_user.employee_id)   # ← strict: only MY team
            .order_by(Nomination.created_at.desc())
        )

        items, total = await paginate_query(db, stmt, page, per_page)
        for item in items:
            item.training_title = item.training.title if item.training else None
            item.employee_name = (
                f"{item.employee.first_name} {item.employee.last_name}" if item.employee else None
            )
            item.nominator_name = item.nominator.full_name if item.nominator else "System"
        return items, total

    @staticmethod
    async def get_by_id(db: AsyncSession, nomination_id: UUID) -> Nomination:
        stmt = select(Nomination).options(
            selectinload(Nomination.training),
            selectinload(Nomination.employee)
        ).where(Nomination.id == nomination_id)
        
        result = await db.execute(stmt)
        n = result.scalar_one_or_none()
        if not n:
            raise NotFoundException("Nomination")
            
        n.training_title = n.training.title if n.training else None
        n.employee_name = f"{n.employee.first_name} {n.employee.last_name}" if n.employee else None
        return n

    @staticmethod
    async def create(
        db: AsyncSession, payload: NominationCreate, current_user
    ) -> Nomination:
        from app.employees.models import Employee
        from app.departments.models import Department
        from sqlalchemy import select
        
        user_role = current_user.role.name if current_user.role else ""
        
        # Determine who the submitting employee is
        emp_res = await db.execute(select(Employee).where(Employee.user_id == current_user.id))
        user_employee = emp_res.scalar_one_or_none()
        
        is_self_nomination = user_employee and user_employee.id == payload.employee_id
        
        # ── One nomination per employee per training (any status) ────────────────
        # An employee may only ever have one nomination record per training,
        # regardless of whether a previous attempt was rejected or pending.
        from app.enrollments.models import Enrollment
        from app.nominations.models import NominationStatus

        existing_nom = await db.execute(
            select(Nomination).where(
                Nomination.employee_id == payload.employee_id,
                Nomination.training_id == payload.training_id,
            )
        )
        if existing_nom.first():
            from app.utils.exceptions import ConflictException
            raise ConflictException(
                "This employee has already been nominated for this training. "
                "Each employee can only be nominated once per training program."
            )
            
        existing_enr = await db.execute(
            select(Enrollment).where(
                Enrollment.employee_id == payload.employee_id,
                Enrollment.training_id == payload.training_id
            )
        )
        if existing_enr.first():
            from app.utils.exceptions import ConflictException
            raise ConflictException("Employee is already enrolled in this training")

        # ── Determine initial status ──────────────────────────────────────────
        if user_role == "admin":
            # Admin nominates → instantly approved
            status = NominationStatus.APPROVED
        elif user_role == "manager":
            # Manager nominates someone → skip manager step, go to admin
            status = NominationStatus.PENDING_ADMIN_APPROVAL
        elif is_self_nomination:
            # Self-nomination by employee
            dept_res = await db.execute(
                select(Department).where(Department.head_id == user_employee.id)
            )
            is_dept_head = dept_res.first() is not None
            if is_dept_head:
                # Dept head nominating themselves → skip manager, go to admin
                status = NominationStatus.PENDING_ADMIN_APPROVAL
            else:
                status = NominationStatus.PENDING_MANAGER_APPROVAL
        else:
            # Employee nominating someone else (unusual but allowed)
            status = NominationStatus.PENDING_MANAGER_APPROVAL

        # ── Resolve manager_id (employee_id of the reviewing manager) ────────────────
        manager_employee_id = await NominationService._find_manager_employee_id(db, payload.employee_id)

        n = Nomination(
            **payload.model_dump(),
            nominated_by=current_user.id,
            status=status,
            manager_id=manager_employee_id,   # ← stored for strict filtering
        )
        db.add(n)
        await db.flush()
        await db.refresh(n, ["id", "created_at", "updated_at"])

        # ── Fetch training name for notification messages ─────────────────────
        training_res = await db.execute(select(Training).where(Training.id == n.training_id))
        training = training_res.scalar_one_or_none()
        training_name = training.title if training else "a training program"

        # ── Fetch nominee's name ──────────────────────────────────────────────
        nominee_res = await db.execute(select(Employee).where(Employee.id == n.employee_id))
        nominee = nominee_res.scalar_one_or_none()
        nominee_name = f"{nominee.first_name} {nominee.last_name}" if nominee else "An employee"

        # ── Send notifications ────────────────────────────────────────────────
        if status == NominationStatus.PENDING_MANAGER_APPROVAL:
            # Notify the manager
            manager_employee_id = await NominationService._find_manager_employee_id(db, n.employee_id)
            # Need manager's user_id for notification
            mgr_user_res = await db.execute(
                select(Employee.user_id).where(Employee.id == manager_employee_id)
            )
            manager_user_id = mgr_user_res.scalar()
            
            await NominationService._notify(
                db, manager_user_id,
                title="New Training Nomination Request",
                message=f"{nominee_name} has requested to attend '{training_name}'. Please review and approve.",
                action_url="/nominations",
            )

        elif status == NominationStatus.PENDING_ADMIN_APPROVAL:
            # Notify all admins (manager submitted directly)
            admin_ids = await NominationService._get_admin_user_ids(db)
            for admin_id in admin_ids:
                await NominationService._notify(
                    db, admin_id,
                    title="Nomination Pending Admin Approval",
                    message=f"{nominee_name} has been nominated for '{training_name}' by their manager. Final approval needed.",
                    action_url="/nominations",
                )

        elif status == NominationStatus.APPROVED:
            # Admin direct-approved — notify employee
            if nominee and nominee.user_id:
                await NominationService._notify(
                    db, nominee.user_id,
                    title="Training Nomination Approved! 🎉",
                    message=f"Your nomination for '{training_name}' has been approved. You are now enrolled!",
                    action_url="/enrollments",
                )

        # ── Auto-create enrollment if instantly approved ───────────────────────
        if status == NominationStatus.APPROVED:
            from app.enrollments.models import Enrollment, EnrollmentStatus
            
            existing = (await db.execute(
                select(Enrollment).where(
                    Enrollment.employee_id == n.employee_id,
                    Enrollment.training_id == n.training_id
                )
            )).scalar_one_or_none()
            
            if not existing:
                db.add(Enrollment(
                    employee_id=n.employee_id,
                    training_id=n.training_id,
                    status=EnrollmentStatus.APPROVED,
                    approved_by=current_user.id
                ))
                await db.flush()
                # Enrollment refresh is optional here but good for consistency
                # await db.refresh(enr, ["id", "created_at", "updated_at"])
                
        db.expunge(n)
        return await NominationService.get_by_id(db, n.id)

    @staticmethod
    async def review(
        db: AsyncSession,
        nomination_id: UUID,
        payload: NominationUpdate,
        current_user,
    ) -> Nomination:
        from app.utils.exceptions import BadRequestException
        from app.employees.models import Employee
        from sqlalchemy import select

        n = await NominationService.get_by_id(db, nomination_id)
        
        user_role = current_user.role.name if current_user.role else ""
        old_status = n.status

        # ── State machine ──────────────────────────────────────────────────────
        if payload.status:
            action = str(payload.status).lower().replace("nominationstatus.", "")

            if action in ("approved", "pending_admin_approval", NominationStatus.APPROVED.value):
                # "Approve" action
                if n.status == NominationStatus.PENDING_MANAGER_APPROVAL:
                    if user_role == "manager" or user_role == "admin":
                        if user_role == "admin":
                            n.status = NominationStatus.APPROVED
                        else:
                            n.status = NominationStatus.PENDING_ADMIN_APPROVAL
                    else:
                        raise BadRequestException("Only managers or admins can approve at this stage")
                elif n.status == NominationStatus.PENDING_ADMIN_APPROVAL:
                    if user_role != "admin":
                        raise BadRequestException("Only admins can perform final approval")
                    n.status = NominationStatus.APPROVED
                else:
                    raise BadRequestException(f"Cannot approve a nomination with status: {n.status.value}")

            elif action in ("rejected", "rejected_by_manager", "rejected_by_admin",
                            NominationStatus.REJECTED_BY_MANAGER.value, NominationStatus.REJECTED_BY_ADMIN.value):
                if user_role == "admin":
                    n.status = NominationStatus.REJECTED_BY_ADMIN
                else:
                    n.status = NominationStatus.REJECTED_BY_MANAGER

        if payload.reviewer_notes is not None:
            n.reviewer_notes = payload.reviewer_notes
        
        n.reviewed_by = current_user.id

        # ── Fetch names for notifications ─────────────────────────────────────
        training_res = await db.execute(select(Training).where(Training.id == n.training_id))
        training = training_res.scalar_one_or_none()
        training_name = training.title if training else "a training program"

        nominee_res = await db.execute(select(Employee).where(Employee.id == n.employee_id))
        nominee = nominee_res.scalar_one_or_none()
        nominee_name = f"{nominee.first_name} {nominee.last_name}" if nominee else "An employee"

        # ── Send notifications based on new status ─────────────────────────────
        if n.status == NominationStatus.PENDING_ADMIN_APPROVAL and old_status != NominationStatus.PENDING_ADMIN_APPROVAL:
            # Manager approved → notify admins
            admin_ids = await NominationService._get_admin_user_ids(db)
            for admin_id in admin_ids:
                await NominationService._notify(
                    db, admin_id,
                    title="Nomination Awaiting Final Approval",
                    message=f"{nominee_name}'s nomination for '{training_name}' was approved by their manager. Please review.",
                    action_url="/nominations",
                )

        elif n.status == NominationStatus.APPROVED and old_status != NominationStatus.APPROVED:
            # Admin final approval → notify employee
            if nominee and nominee.user_id:
                await NominationService._notify(
                    db, nominee.user_id,
                    title="Training Nomination Approved! 🎉",
                    message=f"Your nomination for '{training_name}' has been fully approved. You're now enrolled!",
                    action_url="/enrollments",
                )

        elif n.status == NominationStatus.REJECTED_BY_MANAGER and old_status != NominationStatus.REJECTED_BY_MANAGER:
            # Manager rejected → notify employee
            if nominee and nominee.user_id:
                await NominationService._notify(
                    db, nominee.user_id,
                    title="Training Nomination Not Approved",
                    message=f"Your nomination for '{training_name}' was not approved by your manager.",
                    action_url="/nominations",
                )

        elif n.status == NominationStatus.REJECTED_BY_ADMIN and old_status != NominationStatus.REJECTED_BY_ADMIN:
            # Admin rejected → notify employee
            if nominee and nominee.user_id:
                await NominationService._notify(
                    db, nominee.user_id,
                    title="Training Nomination Declined",
                    message=f"Your nomination for '{training_name}' was declined by admin.",
                    action_url="/nominations",
                )

        # ── Auto-create enrollment on final approval ───────────────────────────
        if n.status == NominationStatus.APPROVED and old_status != NominationStatus.APPROVED:
            from app.enrollments.models import Enrollment, EnrollmentStatus
            
            existing = (await db.execute(
                select(Enrollment).where(
                    Enrollment.employee_id == n.employee_id,
                    Enrollment.training_id == n.training_id
                )
            )).scalar_one_or_none()
            
            if not existing:
                db.add(Enrollment(
                    employee_id=n.employee_id,
                    training_id=n.training_id,
                    status=EnrollmentStatus.APPROVED,
                    approved_by=current_user.id
                ))
                # Decrement available seats
                t_obj = await db.get(Training, n.training_id)
                if t_obj and t_obj.available_seats is not None:
                    t_obj.available_seats -= 1

        await db.flush()
        await db.refresh(n, ["updated_at"])
        
        # Re-fetch with all needed relationships to avoid lazy-loading errors in Pydantic validation
        from sqlalchemy.orm import selectinload
        stmt = select(Nomination).options(
            selectinload(Nomination.training),
            selectinload(Nomination.employee),
            selectinload(Nomination.nominator)
        ).where(Nomination.id == n.id)
        n = (await db.execute(stmt)).scalar_one()
        
        n.training_title = n.training.title if n.training else None
        n.employee_name = f"{n.employee.first_name} {n.employee.last_name}" if n.employee else None
        n.nominator_name = n.nominator.full_name if n.nominator else "System"
        
        return n

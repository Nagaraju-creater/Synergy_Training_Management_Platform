from datetime import date, datetime
import re
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.attendance.models import AttendanceStatus, AttendanceSession, AttendanceRecord, AttendanceLog
from app.attendance.schemas import (
    AttendanceRecordCreate, 
    AttendanceRecordResponse, 
    AttendanceRecordUpdate,
    AttendanceAnalytics,
    AttendanceSessionResponse,
    AdminAttendanceSummary,
)
from app.attendance.service import AttendanceService
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.utils.response import paginated_response, success_response

# Extra imports for shareable link
from app.enrollments.models import Enrollment, EnrollmentStatus
from app.employees.models import Employee
from app.trainings.models import Training
from app.users.models import User
from app.services.jwt_service import JWTService

security = HTTPBearer(auto_error=False)
jwt_service = JWTService()


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt_service.decode_access_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        result = await db.execute(
            select(User).where(User.id == UUID(user_id))
        )
        user = result.scalar_one_or_none()
        return user
    except Exception:
        return None

router = APIRouter()


@router.post("/mark", response_model=AttendanceRecordResponse)
async def mark_attendance(
    payload: AttendanceRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Mark attendance for the current user."""
    if not current_user.employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not linked to an employee profile."
        )
    
    record = await AttendanceService.mark_attendance(
        db, current_user.employee.id, payload, current_user.id
    )
    return record


@router.get("/me", response_model=List[AttendanceRecordResponse])
async def get_my_attendance(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get attendance records for the logged-in employee."""
    if not current_user.employee:
        return []
    
    items, _ = await AttendanceService.get_all(db, employee_id=current_user.employee.id)
    
    for item in items:
        item.employee_name = f"{item.employee.first_name} {item.employee.last_name}" if item.employee else "Unknown"
        item.training_title = item.training.title if item.training else "Unknown"
        
    return items


@router.get("/session/{training_id}", response_model=AttendanceSessionResponse)
async def get_attendance_session(
    training_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Check/Get the attendance session for a specific training."""
    session = await AttendanceService.ensure_session(db, training_id)
    training = await db.get(Training, training_id)

    return {
        "id": session.id,
        "training_id": session.training_id,
        "training_title": training.title if training else None,
        "training_slug": re.sub(r"[^a-z0-9]+", "-", training.title.lower()).strip("-") if training else None,
        "secure_token": session.secure_token,
        "opens_at": session.opens_at,
        "closes_at": session.closes_at,
        "grace_period_end": session.grace_period_end,
        "is_active": session.is_active,
    }


@router.get("", dependencies=[Depends(require_role("admin", "manager"))])
async def list_attendance(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    employee_id: Optional[UUID] = Query(None),
    training_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    status: Optional[AttendanceStatus] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List attendance records with filters (Admin/Manager only)."""
    # Managers can only see their team if employee_id/department_id not specified
    manager_scope_id = None
    if current_user.role.name == "manager" and not employee_id and not department_id:
        # In a real app, we'd filter by manager's team. 
        # For now, let the service handle it if we pass department or manager logic.
        pass

    items, total = await AttendanceService.get_all(
        db, page, per_page, employee_id, training_id, department_id, status, start_date, end_date
    )
    
    # Transform items to include employee_name and training_title
    for item in items:
        item.employee_name = f"{item.employee.first_name} {item.employee.last_name}" if item.employee else "Unknown"
        item.training_title = item.training.title if item.training else "Unknown"

    return paginated_response(items, total, page, per_page)


@router.get("/me/active")
async def get_my_active_session(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get the active or next available attendance session for the current employee."""
    if not current_user.employee:
        return None
    return await AttendanceService.get_active_session_for_employee(db, current_user.employee.id)


@router.get("/me/upcoming")
async def get_my_upcoming_sessions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get all upcoming enrolled training sessions for the current employee."""
    if not current_user.employee:
        return []
    return await AttendanceService.get_my_upcoming_sessions(db, current_user.employee.id)


@router.get("/analytics", response_model=AttendanceAnalytics)
async def get_attendance_analytics(
    employee_id: Optional[UUID] = Query(None),
    training_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get attendance analytics summary."""
    user_role = current_user.role.name.lower() if current_user.role else "employee"
    is_manager = "manager" in user_role or "admin" in user_role
    
    if not is_manager:
        if not current_user.employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current user is not linked to an employee profile."
            )
        employee_id = current_user.employee.id
        
    return await AttendanceService.get_analytics(db, employee_id, training_id)


# ── Admin-only real-time dashboard endpoints ──────────────────────────────────

@router.get("/admin/summary", dependencies=[Depends(require_role("admin", "manager"))])
async def get_admin_attendance_summary(
    employee_id: Optional[UUID] = Query(None),
    training_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    status: Optional[AttendanceStatus] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    financial_year: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Returns aggregated attendance KPIs for the admin dashboard:
    participation rate, active sessions, missed sessions, trend data.
    """
    summary = await AttendanceService.get_admin_summary(
        db, employee_id, training_id, department_id, status, start_date, end_date, financial_year
    )
    return success_response(summary)


@router.get("/admin/live-sessions", dependencies=[Depends(require_role("admin", "manager"))])
async def get_admin_live_sessions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Returns currently-active attendance sessions with live participation counts.
    """
    sessions = await AttendanceService.get_live_sessions(db)
    return success_response(sessions)


@router.get("/admin/logs", dependencies=[Depends(require_role("admin", "manager"))])
async def get_admin_attendance_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    employee_id: Optional[UUID] = Query(None),
    training_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    status: Optional[AttendanceStatus] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    financial_year: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Returns paginated, enriched attendance log entries with employee,
    department, training context. Optimized with eager-loading.
    """
    logs, total = await AttendanceService.get_admin_logs(
        db, page, per_page, employee_id, training_id,
        department_id, status, start_date, end_date, search, financial_year
    )
    return paginated_response(logs, total, page, per_page)


# ── Shareable Attendance Link System Endpoints ───────────────────────────────

class SessionAttendanceRecord(BaseModel):
    employee_id: UUID
    status: AttendanceStatus

class SessionAttendanceSubmit(BaseModel):
    submitted_by: Optional[str] = None
    records: List[SessionAttendanceRecord]


def get_roster_token(link_token: str) -> str:
    token = link_token.rsplit("-", 1)[-1]
    try:
        UUID(token)
        raise HTTPException(status_code=404, detail="Secure attendance token required.")
    except ValueError:
        return token


@router.get("/session-link/{session_id_or_slug}")
async def get_public_session_link_details(
    session_id_or_slug: str,
    db: AsyncSession = Depends(get_db)
):
    token = get_roster_token(session_id_or_slug)
    stmt = (
        select(AttendanceSession)
        .options(selectinload(AttendanceSession.training))
        .where(AttendanceSession.secure_token == token)
    )

    session = (await db.execute(stmt)).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    training = session.training
    await AttendanceService.sync_session_window(session, training)
    now = datetime.now()
    if not session.is_active or now > session.closes_at:
        raise HTTPException(status_code=410, detail="Attendance session has expired.")

    # A secure roster link is a trainer/coordinator desk, not an employee
    # self-check-in link. It can be edited until the session expires.
    is_editable = session.is_active

    enroll_stmt = (
        select(Enrollment)
        .options(selectinload(Enrollment.employee).selectinload(Employee.department))
        .where(Enrollment.training_id == training.id, Enrollment.status.in_([EnrollmentStatus.APPROVED, EnrollmentStatus.PENDING]))
    )
    enrollments = (await db.execute(enroll_stmt)).scalars().all()

    rec_stmt = select(AttendanceRecord).where(AttendanceRecord.session_id == session.id)
    records = (await db.execute(rec_stmt)).scalars().all()
    record_map = {r.employee_id: r for r in records}

    roster = []
    for enroll in enrollments:
        emp = enroll.employee
        if emp:
            existing_rec = record_map.get(emp.id)
            roster.append({
                "id": str(emp.id),
                "employee_code": emp.employee_code,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "designation": emp.designation or "Employee",
                "profile_image_url": emp.profile_image_url,
                "department_name": emp.department.name if emp.department else "Unassigned",
                "status": existing_rec.status.value if existing_rec else None
            })

    # Return structured data mimicking original to avoid frontend breakages, 
    # but adding slug and token
    slug = re.sub(r'[^a-z0-9]+', '-', training.title.lower()).strip('-')
    
    return success_response({
        "session": {
            "id": str(session.id),
            "secure_token": session.secure_token,
            "training_slug": slug,
            "training_id": str(training.id),
            "training_title": training.title,
            "trainer_name": training.trainer_name or "Internal Trainer",
            "start_date": training.start_date.isoformat() if training.start_date else None,
            "start_time": training.start_time,
            "duration_hours": training.duration_hours,
            "venue": training.venue,
            "delivery_mode": training.delivery_mode.value if training.delivery_mode else None,
            "meeting_link": training.meeting_link,
            "opens_at": session.opens_at.isoformat(),
            "closes_at": session.closes_at.isoformat(),
            "is_editable": is_editable,
            "enrolled_count": len(roster)
        },
        "roster": roster
    })


@router.post("/session-link/{session_id_or_slug}/submit")
async def submit_public_attendance(
    session_id_or_slug: str,
    payload: SessionAttendanceSubmit,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_current_user)
):
    token = get_roster_token(session_id_or_slug)
    stmt = (
        select(AttendanceSession)
        .options(selectinload(AttendanceSession.training))
        .where(AttendanceSession.secure_token == token)
    )
    
    session = (await db.execute(stmt)).scalar_one_or_none()
    if not session or not session.training:
        raise HTTPException(status_code=404, detail="Session or training not found.")

    await AttendanceService.sync_session_window(session, session.training)
    now = datetime.now()
    if not session.is_active or now > session.closes_at:
        raise HTTPException(status_code=400, detail="Attendance window is closed.")

    performed_by = current_user.id if current_user else session.training.created_by
    submitted_by = payload.submitted_by or "System"
    eligible_stmt = select(Enrollment.employee_id).where(
        Enrollment.training_id == session.training.id,
        Enrollment.status.in_([EnrollmentStatus.APPROVED, EnrollmentStatus.PENDING]),
    )
    eligible_employee_ids = set((await db.execute(eligible_stmt)).scalars().all())
    submitted_employee_ids = {entry.employee_id for entry in payload.records}
    if not submitted_employee_ids.issubset(eligible_employee_ids):
        raise HTTPException(status_code=403, detail="Attendance can only be submitted for enrolled participants.")

    for entry in payload.records:
        rec_stmt = select(AttendanceRecord).where(AttendanceRecord.session_id == session.id, AttendanceRecord.employee_id == entry.employee_id)
        existing_rec = (await db.execute(rec_stmt)).scalar_one_or_none()

        if existing_rec:
            old_status = existing_rec.status
            existing_rec.status = entry.status
            existing_rec.marked_at = now
            existing_rec.remarks = f"Submitted by {submitted_by}"
        else:
            old_status = None
            new_rec = AttendanceRecord(
                employee_id=entry.employee_id, training_id=session.training.id,
                session_id=session.id, status=entry.status, marked_at=now,
                attendance_open_time=session.opens_at,
                attendance_close_time=session.closes_at,
                remarks=f"Submitted by {submitted_by}"
            )
            db.add(new_rec)
            await db.flush()
            existing_rec = new_rec

        # NOTE: Roster submission ONLY records attendance.
        # Enrollment completion, gamification points, and effectiveness assignment
        # are handled automatically when the training end time passes (via _compute_status
        # in trainings/service.py). This ensures effectiveness appears only after training ends.

        if performed_by:
            db.add(AttendanceLog(
                record_id=existing_rec.id,
                action="UPDATED" if old_status else "MARKED",
                performed_by=performed_by,
                old_status=old_status,
                new_status=entry.status,
                reason=f"Roster submission by {submitted_by}",
            ))

    await db.commit()
    return success_response({"message": "Attendance records updated successfully."})

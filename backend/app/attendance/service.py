import uuid
from datetime import datetime, timedelta, date, time as dt_time
from typing import List, Tuple, Optional, Any
import secrets
import string
from sqlalchemy import select, func, and_, or_, desc, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.attendance.models import AttendanceRecord, AttendanceSession, AttendanceStatus, AttendanceLog
from app.attendance.schemas import AttendanceRecordCreate, AttendanceRecordUpdate
from app.trainings.models import Training, TrainingStatus
from app.employees.models import Employee
from app.departments.models import Department
from app.enrollments.models import Enrollment, EnrollmentStatus
from app.utils.exceptions import NotFoundException, BadRequestException


class AttendanceService:
    @staticmethod
    def create_session_token() -> str:
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(10))

    @staticmethod
    async def calculate_end_time(start_time_str: Optional[str], duration_hours: float) -> str:
        """Helper to calculate end time string from start time and duration."""
        if not start_time_str:
            return "11:00 AM"
        try:
            # Parse "10:00 AM" or "14:00"
            from datetime import timedelta
            for fmt in ("%I:%M %p", "%H:%M"):
                try:
                    dt = datetime.strptime(start_time_str, fmt)
                    end_dt = dt + timedelta(hours=duration_hours)
                    return end_dt.strftime("%I:%M %p")
                except ValueError:
                    continue
            return "05:00 PM"
        except Exception:
            return "05:00 PM"

    @staticmethod
    async def get_training_datetime(training: Training) -> Optional[datetime]:
        """Combines start_date and start_time into a datetime object."""
        if not training.start_date:
            return None
        
        start_time_str = training.start_time or "09:00 AM"
        try:
            # Parse "10:00 AM" or "22:00"
            t = datetime.strptime(start_time_str, "%I:%M %p").time()
        except ValueError:
            try:
                t = datetime.strptime(start_time_str, "%H:%M").time()
            except ValueError:
                t = dt_time(9, 0)
        
        return datetime.combine(training.start_date, t)

    @staticmethod
    async def sync_session_window(session: AttendanceSession, training: Training) -> AttendanceSession:
        """Keep stored session windows aligned with the roster generation window."""
        start_dt = await AttendanceService.get_training_datetime(training)
        if not start_dt:
            return session

        expected_opens_at = start_dt - timedelta(minutes=30)
        expected_grace_end = start_dt + timedelta(minutes=15)
        expected_closes_at = start_dt + timedelta(hours=max(training.duration_hours or 0, 0.75))

        # Older sessions were created with a narrower -10/+45 minute window.
        if session.opens_at > expected_opens_at:
            session.opens_at = expected_opens_at
        if session.grace_period_end != expected_grace_end:
            session.grace_period_end = expected_grace_end
        if session.closes_at < expected_closes_at:
            session.closes_at = expected_closes_at

        return session

    @staticmethod
    async def ensure_session(db: AsyncSession, training_id: uuid.UUID) -> AttendanceSession:
        """Ensures an attendance session exists for the training based on its start time."""
        stmt = select(AttendanceSession).where(AttendanceSession.training_id == training_id)
        session = (await db.execute(stmt)).scalar_one_or_none()
        
        if session:
            if not session.secure_token:
                session.secure_token = AttendanceService.create_session_token()
            training = await db.get(Training, training_id)
            if training:
                await AttendanceService.sync_session_window(session, training)
            await db.flush()
            return session
        
        training = await db.get(Training, training_id)
        if not training:
            raise NotFoundException("Training")
        
        start_dt = await AttendanceService.get_training_datetime(training)
        if not start_dt:
            # If no start date, we can't create a session yet
            raise BadRequestException("Training has no start date defined.")
        
        # Roster links stay valid for the training window and expire afterwards.
        opens_at = start_dt - timedelta(minutes=30)
        grace_period_end = start_dt + timedelta(minutes=15)
        closes_at = start_dt + timedelta(hours=max(training.duration_hours or 0, 0.75))
        
        session = AttendanceSession(
            training_id=training_id,
            opens_at=opens_at,
            closes_at=closes_at,
            grace_period_end=grace_period_end,
            is_active=True,
            secure_token=AttendanceService.create_session_token()
        )
        db.add(session)
        await db.flush()
        return session

    @staticmethod
    async def mark_attendance(
        db: AsyncSession, 
        employee_id: uuid.UUID, 
        payload: AttendanceRecordCreate,
        current_user_id: uuid.UUID
    ) -> AttendanceRecord:
        """Marks attendance for an employee."""
        # 1. Ensure user is enrolled
        enroll_stmt = select(Enrollment).where(
            and_(Enrollment.employee_id == employee_id, Enrollment.training_id == payload.training_id)
        )
        enrollment = (await db.execute(enroll_stmt)).scalar_one_or_none()
        if not enrollment:
            raise BadRequestException("Employee is not enrolled in this training.")

        # 2. Ensure session window is open
        session = await AttendanceService.ensure_session(db, payload.training_id)
        now = datetime.now()
        
        if now < session.opens_at:
            raise BadRequestException(f"Attendance is not open yet. Opens at {session.opens_at.strftime('%I:%M %p')}")
        if now > session.closes_at:
            raise BadRequestException("Attendance window has closed.")

        # 3. Check if already marked
        stmt = select(AttendanceRecord).where(
            and_(AttendanceRecord.employee_id == employee_id, AttendanceRecord.training_id == payload.training_id)
        )
        record = (await db.execute(stmt)).scalar_one_or_none()
        
        if record and record.status != AttendanceStatus.ABSENT:
            raise BadRequestException("Attendance already marked for this training.")

        # 4. Calculate status
        status = AttendanceStatus.PRESENT
        if now > session.grace_period_end:
            status = AttendanceStatus.LATE

        if not record:
            record = AttendanceRecord(
                employee_id=employee_id,
                training_id=payload.training_id,
                session_id=session.id,
                status=status,
                marked_at=now,
                attendance_open_time=session.opens_at,
                attendance_close_time=session.closes_at,
                device_info=payload.device_info,
                ip_address=payload.ip_address
            )
            db.add(record)
        else:
            old_status = record.status
            record.status = status
            record.marked_at = now
            record.session_id = session.id
            record.device_info = payload.device_info
            record.ip_address = payload.ip_address
            
            # Log the update if it's an override or re-mark
            log = AttendanceLog(
                record_id=record.id,
                action="MARKED",
                performed_by=current_user_id,
                old_status=old_status,
                new_status=status,
                reason="Self-marked attendance"
            )
            db.add(log)

        # NOTE: We intentionally do NOT mark enrollment as COMPLETED here.
        # Enrollment completion and effectiveness assignment are handled by the
        # training lifecycle hook in trainings/service.py via _compute_status().
        # This triggers only when the training's end time actually passes,
        # ensuring effectiveness tasks appear AFTER the course ends, not on attendance.


        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def get_all(
        db: AsyncSession,
        page: int = 1,
        per_page: int = 20,
        employee_id: Optional[uuid.UUID] = None,
        training_id: Optional[uuid.UUID] = None,
        department_id: Optional[uuid.UUID] = None,
        status: Optional[AttendanceStatus] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Tuple[List[AttendanceRecord], int]:
        """Fetches attendance records with filters."""
        stmt = select(AttendanceRecord).options(
            selectinload(AttendanceRecord.employee).selectinload(Employee.department),
            selectinload(AttendanceRecord.training)
        )

        if employee_id:
            stmt = stmt.where(AttendanceRecord.employee_id == employee_id)
        if training_id:
            stmt = stmt.where(AttendanceRecord.training_id == training_id)
        if status:
            stmt = stmt.where(AttendanceRecord.status == status)
        if department_id:
            # Need to join with Employee to filter by department
            stmt = stmt.join(AttendanceRecord.employee).where(Employee.department_id == department_id)
        
        if start_date:
            stmt = stmt.where(func.date(AttendanceRecord.created_at) >= start_date)
        if end_date:
            stmt = stmt.where(func.date(AttendanceRecord.created_at) <= end_date)

        stmt = stmt.order_by(desc(AttendanceRecord.created_at))

        # Pagination
        total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.offset((page - 1) * per_page).limit(per_page)
        items = (await db.execute(stmt)).scalars().all()

        return list(items), total

    @staticmethod
    async def get_analytics(
        db: AsyncSession, 
        employee_id: Optional[uuid.UUID] = None,
        training_id: Optional[uuid.UUID] = None
    ) -> dict:
        """Get attendance analytics summary."""
        stmt = select(AttendanceRecord)
        
        if employee_id:
            stmt = stmt.where(AttendanceRecord.employee_id == employee_id)
        if training_id:
            stmt = stmt.where(AttendanceRecord.training_id == training_id)
            
        result = await db.execute(stmt)
        results = result.scalars().all()
        
        total = len(results)
        if total == 0:
            return {
                "total_records": 0,
                "present_count": 0,
                "late_count": 0,
                "absent_count": 0,
                "active_sessions_count": 0,
                "attendance_percentage": 0,
                "late_percentage": 0,
                "completion_data": [],
                "trend_data": [],
                "recent_activity": []
            }
            
        present = len([r for r in results if r.status == AttendanceStatus.PRESENT])
        late = len([r for r in results if r.status == AttendanceStatus.LATE])
        absent = len([r for r in results if r.status == AttendanceStatus.ABSENT])
        
        # Active Sessions Count
        active_sessions_stmt = select(func.count(AttendanceSession.id)).where(
            and_(
                AttendanceSession.opens_at <= datetime.now(),
                AttendanceSession.closes_at >= datetime.now()
            )
        )
        active_sessions_count = (await db.execute(active_sessions_stmt)).scalar() or 0

        # Completion Data for Donut Chart
        completion_data = [
            {"name": "Present", "value": present},
            {"name": "Late", "value": late},
            {"name": "Absent", "value": absent}
        ]

        # Trend Data (last 7 training sessions)
        trend_stmt = (
            select(
                Training.title,
                func.count(AttendanceRecord.id).label("total"),
                func.sum(case((or_(AttendanceRecord.status == AttendanceStatus.PRESENT, AttendanceRecord.status == AttendanceStatus.LATE), 1), else_=0)).label("present")
            )
            .join(AttendanceRecord)
            .group_by(Training.id)
            .order_by(Training.start_date.desc())
            .limit(7)
        )
        
        if employee_id:
            trend_stmt = trend_stmt.where(AttendanceRecord.employee_id == employee_id)
            
        trend_result = await db.execute(trend_stmt)
        trend_data = [
            {
                "label": row.title[:10] + "...", 
                "rate": round((row.present / row.total) * 100, 1) if row.total > 0 else 0
            }
            for row in reversed(trend_result.all())
        ]

        # Recent Activity
        activity_stmt = (
            select(AttendanceRecord)
            .options(selectinload(AttendanceRecord.employee), selectinload(AttendanceRecord.training))
            .order_by(AttendanceRecord.marked_at.desc())
            .limit(5)
        )
        if employee_id:
            activity_stmt = activity_stmt.where(AttendanceRecord.employee_id == employee_id)
            
        activity_result = await db.execute(activity_stmt)
        recent_activity = [
            {
                "user": f"{row.employee.first_name} {row.employee.last_name}" if row.employee else "Unknown",
                "training": row.training.title if row.training else "Unknown",
                "status": row.status,
                "time": row.marked_at.isoformat() if row.marked_at else None
            }
            for row in activity_result.scalars().all()
        ]

        return {
            "total_records": total,
            "present_count": present,
            "late_count": late,
            "absent_count": absent,
            "active_sessions_count": active_sessions_count,
            "attendance_percentage": round(((present + late) / total) * 100, 2) if total > 0 else 0,
            "late_percentage": round((late / total) * 100, 2) if total > 0 else 0,
            "completion_data": completion_data,
            "trend_data": trend_data,
            "recent_activity": recent_activity
        }

    @staticmethod
    async def get_my_upcoming_sessions(
        db: AsyncSession,
        employee_id: uuid.UUID
    ) -> List[dict]:
        """Fetches upcoming training sessions the employee is enrolled in."""
        # Get all enrollments for this employee (broaden to include PENDING if needed)
        stmt = (
            select(Enrollment)
            .options(selectinload(Enrollment.training))
            .where(
                and_(
                    Enrollment.employee_id == employee_id,
                    or_(
                        Enrollment.status == EnrollmentStatus.APPROVED,
                        Enrollment.status == EnrollmentStatus.PENDING
                    )
                )
            )
            .join(Training)
            .where(
                and_(
                    Training.is_attendance_enabled == True,
                    Training.is_archived == False,
                    Training.end_date >= date.today() # Include ongoing
                )
            )
            .order_by(Training.start_date.asc())
        )
        
        result = await db.execute(stmt)
        enrollments = result.scalars().all()
        
        upcoming = []
        for e in enrollments:
            training = e.training
            
            # Check if attendance is already marked
            marked_stmt = select(AttendanceRecord).where(
                and_(AttendanceRecord.employee_id == employee_id, AttendanceRecord.training_id == training.id)
            )
            marked = (await db.execute(marked_stmt)).scalar_one_or_none()
            
            # If already marked PRESENT or LATE, we might still show it with status "marked"
            # If ABSENT, it might still show up if session is active
            
            start_dt = await AttendanceService.get_training_datetime(training)
            if not start_dt:
                continue

            # Ensure session exists to get precise times
            session = await AttendanceService.ensure_session(db, training.id)
            
            upcoming.append({
                "training_id": str(training.id),
                "title": training.title,
                "trainer": training.trainer_name or "Internal Trainer",
                "start_date": training.start_date.isoformat() if training.start_date else None,
                "end_date": training.end_date.isoformat() if training.end_date else None,
                "start_time": training.start_time or "09:00 AM",
                "end_time": await AttendanceService.calculate_end_time(training.start_time, training.duration_hours),
                "opens_at": session.opens_at.isoformat(),
                "closes_at": session.closes_at.isoformat(),
                "grace_period_end": session.grace_period_end.isoformat(),
                "attendance_status": marked.status if marked else "PENDING",
                "enrollment_status": e.status,
                "status": "upcoming" # Default, refined in active session logic
            })
            
        return upcoming

    @staticmethod
    async def get_active_session_for_employee(
        db: AsyncSession,
        employee_id: uuid.UUID
    ) -> Optional[dict]:
        """Finds the 'active' session (currently open or opening next) for an employee."""
        upcoming = await AttendanceService.get_my_upcoming_sessions(db, employee_id)
        if not upcoming:
            return None
            
        now = datetime.now()
        
        # 1. Look for currently open session
        for session in upcoming:
            opens_at = datetime.fromisoformat(session["opens_at"])
            closes_at = datetime.fromisoformat(session["closes_at"])
            if opens_at <= now <= closes_at:
                session["status"] = "open"
                return session
        
        # 2. If none open, look for one opening soon
        for session in upcoming:
            opens_at = datetime.fromisoformat(session["opens_at"])
            if opens_at > now:
                session["status"] = "soon"
                return session
                
        return upcoming[0] if upcoming else None

    # ── Admin-specific service methods ────────────────────────────────────────

    @staticmethod
    def roster_record_filter():
        return or_(
            AttendanceRecord.remarks.ilike("Submitted by%"),
            AttendanceRecord.remarks.ilike("Roster submission%"),
            select(AttendanceLog.id).where(
                AttendanceLog.record_id == AttendanceRecord.id,
                AttendanceLog.reason.ilike("Roster submission%"),
            ).exists(),
        )

    @staticmethod
    def get_financial_year_bounds(financial_year: Optional[str]) -> tuple[Optional[date], Optional[date]]:
        if not financial_year:
            return None, None
        try:
            start_year = int(financial_year.split("-")[0])
        except (TypeError, ValueError):
            today = date.today()
            start_year = today.year if today.month >= 4 else today.year - 1
        return date(start_year, 4, 1), date(start_year + 1, 3, 31)

    @staticmethod
    def apply_admin_record_filters(
        stmt, employee_id=None, training_id=None, department_id=None, status=None,
        start_date=None, end_date=None, financial_year=None,
    ):
        fy_start, fy_end = AttendanceService.get_financial_year_bounds(financial_year)
        stmt = stmt.where(AttendanceService.roster_record_filter())
        if employee_id:
            stmt = stmt.where(AttendanceRecord.employee_id == employee_id)
        if training_id:
            stmt = stmt.where(AttendanceRecord.training_id == training_id)
        if status:
            stmt = stmt.where(AttendanceRecord.status == status)
        if department_id:
            stmt = stmt.join(AttendanceRecord.employee).where(Employee.department_id == department_id)
        if start_date:
            stmt = stmt.where(func.date(AttendanceRecord.marked_at) >= start_date)
        if end_date:
            stmt = stmt.where(func.date(AttendanceRecord.marked_at) <= end_date)
        if fy_start:
            stmt = stmt.where(AttendanceRecord.training.has(Training.start_date >= fy_start))
        if fy_end:
            stmt = stmt.where(AttendanceRecord.training.has(Training.start_date <= fy_end))
        return stmt

    @staticmethod
    async def get_admin_summary(
        db: AsyncSession, employee_id=None, training_id=None, department_id=None, status=None,
        start_date=None, end_date=None, financial_year=None,
    ) -> dict:
        """Admin metrics from current roster-submitted AttendanceRecord rows."""
        now = datetime.now()
        active_sessions_count = (await db.execute(
            select(func.count(AttendanceSession.id)).where(and_(
                AttendanceSession.opens_at <= now,
                AttendanceSession.closes_at >= now,
                AttendanceSession.is_active == True,
            ))
        )).scalar() or 0

        rows = (await db.execute(AttendanceService.apply_admin_record_filters(
            select(AttendanceRecord.status), employee_id, training_id, department_id,
            status, start_date, end_date, financial_year,
        ))).all()
        total = len(rows)
        present = sum(1 for row in rows if row.status == AttendanceStatus.PRESENT)
        late = sum(1 for row in rows if row.status == AttendanceStatus.LATE)
        absent = sum(1 for row in rows if row.status == AttendanceStatus.ABSENT)
        excused = sum(1 for row in rows if row.status == AttendanceStatus.PARTIAL)

        trend_stmt = AttendanceService.apply_admin_record_filters(
            select(
                Training.id, Training.title, Training.start_date,
                func.count(AttendanceRecord.id).label("total"),
                func.sum(case((AttendanceRecord.status == AttendanceStatus.PRESENT, 1), else_=0)).label("present"),
                func.sum(case((AttendanceRecord.status == AttendanceStatus.LATE, 1), else_=0)).label("late"),
                func.sum(case((AttendanceRecord.status == AttendanceStatus.ABSENT, 1), else_=0)).label("missed"),
            ).join(Training, AttendanceRecord.training_id == Training.id),
            employee_id, training_id, department_id, status, start_date, end_date, financial_year,
        ).group_by(Training.id, Training.title, Training.start_date).order_by(Training.start_date.desc()).limit(7)
        trend_rows = (await db.execute(trend_stmt)).all()
        trend = [{
            "label": row.title[:12] + ("..." if len(row.title) > 12 else ""),
            "date": row.start_date.isoformat() if row.start_date else None,
            "rate": round((row.present / row.total) * 100, 1) if row.total else 0,
            "participation_rate": round(((row.present + row.late) / row.total) * 100, 1) if row.total else 0,
            "missed": row.missed or 0,
        } for row in reversed(trend_rows)]

        dept_stmt = AttendanceService.apply_admin_record_filters(
            select(
                Department.name.label("department"),
                func.count(AttendanceRecord.id).label("total"),
                func.sum(case((AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]), 1), else_=0)).label("attended"),
            ).join(Employee, AttendanceRecord.employee_id == Employee.id).join(Department, Employee.department_id == Department.id, isouter=True),
            employee_id, training_id, None, status, start_date, end_date, financial_year,
        )
        if department_id:
            dept_stmt = dept_stmt.where(Employee.department_id == department_id)
        dept_rows = (await db.execute(dept_stmt.group_by(Department.name))).all()

        return {
            "total_records": total,
            "total_enrolled": total,
            "total_present": present,
            "total_late": late,
            "total_absent": absent,
            "total_excused": excused,
            "total_missed": absent,
            "active_sessions_count": active_sessions_count,
            "attendance_percentage": round((present / total) * 100, 2) if total else 0.0,
            "participation_rate": round(((present + late) / total) * 100, 2) if total else 0.0,
            "completion_rate": round((present / total) * 100, 2) if total else 0.0,
            "late_percentage": round((late / total) * 100, 2) if total else 0.0,
            "trend_data": trend,
            "completion_data": [
                {"name": "Present", "value": present},
                {"name": "Late", "value": late},
                {"name": "Absent", "value": absent},
                {"name": "Excused", "value": excused},
            ],
            "department_attendance": [{
                "department": row.department or "Unassigned",
                "total": row.total,
                "attendance_percentage": round((row.attended / row.total) * 100, 1) if row.total else 0,
            } for row in dept_rows],
            "most_attended_trainings": sorted(trend, key=lambda item: item["participation_rate"], reverse=True)[:5],
        }

    @staticmethod
    async def get_live_sessions(db: AsyncSession) -> list:
        """
        Returns all currently-active attendance sessions with training context and
        live participation counts.
        """
        now = datetime.now()
        stmt = (
            select(AttendanceSession)
            .options(
                selectinload(AttendanceSession.training),
                selectinload(AttendanceSession.records)
            )
            .where(
                and_(
                    AttendanceSession.opens_at <= now,
                    AttendanceSession.closes_at >= now,
                    AttendanceSession.is_active == True,
                )
            )
            .order_by(AttendanceSession.opens_at.asc())
        )
        result = await db.execute(stmt)
        sessions = result.scalars().all()

        live = []
        for session in sessions:
            training = session.training
            if not training:
                continue

            # Count enrolled employees for this training
            enrolled_stmt = select(func.count(Enrollment.id)).where(
                and_(
                    Enrollment.training_id == training.id,
                    Enrollment.status.in_([EnrollmentStatus.APPROVED, EnrollmentStatus.PENDING])
                )
            )
            enrolled_count = (await db.execute(enrolled_stmt)).scalar() or 0

            roster_rows = (await db.execute(
                select(AttendanceRecord.status).where(
                    AttendanceRecord.session_id == session.id,
                    AttendanceService.roster_record_filter(),
                )
            )).all()
            submitted_count = len(roster_rows)
            marked_count = sum(1 for r in roster_rows if r.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE))
            participation_rate = round((marked_count / enrolled_count * 100), 2) if enrolled_count > 0 else 0.0

            live.append({
                "session_id": str(session.id),
                "training_id": str(training.id),
                "training_title": training.title,
                "trainer_name": training.trainer_name,
                "opens_at": session.opens_at.isoformat(),
                "closes_at": session.closes_at.isoformat(),
                "grace_period_end": session.grace_period_end.isoformat(),
                "enrolled_count": enrolled_count,
                "marked_count": marked_count,
                "submitted_count": submitted_count,
                "attendance_submitted": submitted_count > 0,
                "participation_rate": participation_rate,
            })

        return live

    @staticmethod
    async def get_admin_logs(
        db: AsyncSession,
        page: int = 1,
        per_page: int = 20,
        employee_id: Optional[uuid.UUID] = None,
        training_id: Optional[uuid.UUID] = None,
        department_id: Optional[uuid.UUID] = None,
        status: Optional[AttendanceStatus] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
        financial_year: Optional[str] = None,
    ) -> tuple:
        """
        Returns paginated, enriched attendance log entries for admin view.
        Avoids N+1 by eager-loading employee department and training in one pass.
        """
        stmt = (
            select(AttendanceRecord)
            .options(
                selectinload(AttendanceRecord.employee).selectinload(Employee.department),
                selectinload(AttendanceRecord.training),
                selectinload(AttendanceRecord.session),
            )
        )
        stmt = AttendanceService.apply_admin_record_filters(
            stmt, employee_id, training_id, department_id, status, start_date, end_date, financial_year,
        )
        if search:
            term = search.lower()
            stmt = stmt.where(
                or_(
                    AttendanceRecord.employee.has(or_(
                        func.lower(Employee.first_name + " " + Employee.last_name).contains(term),
                        func.lower(Employee.employee_code).contains(term),
                    )),
                    AttendanceRecord.training.has(func.lower(Training.title).contains(term)),
                )
            )

        stmt = stmt.order_by(AttendanceRecord.marked_at.desc().nullslast())

        total_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(total_stmt)).scalar_one()

        stmt = stmt.offset((page - 1) * per_page).limit(per_page)
        records = (await db.execute(stmt)).scalars().all()

        logs = []
        for r in records:
            emp = r.employee
            tr = r.training
            logs.append({
                "record_id": str(r.id),
                "employee_id": str(r.employee_id),
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
                "employee_code": emp.employee_code if emp else None,
                "department_name": emp.department.name if emp and emp.department else None,
                "training_id": str(r.training_id),
                "training_title": tr.title if tr else "Unknown",
                "status": r.status,
                "marked_at": r.marked_at.isoformat() if r.marked_at else None,
                "submitted_time": r.marked_at.isoformat() if r.marked_at else None,
                "marked_by": r.remarks.removeprefix("Submitted by ").strip() if r.remarks and r.remarks.startswith("Submitted by ") else "Roster session",
                "session_id": str(r.session_id) if r.session_id else None,
                "session_date": tr.start_date.isoformat() if tr and tr.start_date else None,
                "device_info": r.device_info,
                "ip_address": r.ip_address,
                "created_at": r.created_at.isoformat(),
            })

        return logs, total

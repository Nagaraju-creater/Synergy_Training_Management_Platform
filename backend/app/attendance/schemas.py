from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

from app.attendance.models import AttendanceStatus


class AttendanceRecordBase(BaseModel):
    status: AttendanceStatus
    marked_at: Optional[datetime] = None
    remarks: Optional[str] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None


class AttendanceRecordCreate(BaseModel):
    training_id: UUID
    device_info: Optional[str] = None
    ip_address: Optional[str] = None


class AttendanceRecordUpdate(BaseModel):
    status: AttendanceStatus
    remarks: Optional[str] = None


class AttendanceSessionResponse(BaseModel):
    id: UUID
    training_id: UUID
    training_title: Optional[str] = None
    training_slug: Optional[str] = None
    secure_token: Optional[str] = None
    opens_at: datetime
    closes_at: datetime
    grace_period_end: datetime
    is_active: bool

    class Config:
        from_attributes = True


class AttendanceRecordResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    training_id: UUID
    training_title: Optional[str] = None
    status: AttendanceStatus
    marked_at: Optional[datetime] = None
    attendance_open_time: Optional[datetime] = None
    attendance_close_time: Optional[datetime] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceAnalytics(BaseModel):
    total_records: int
    present_count: int
    late_count: int
    absent_count: int
    attendance_percentage: float
    late_percentage: float
    completion_data: Optional[List[dict]] = None
    trend_data: Optional[List[dict]] = None
    recent_activity: Optional[List[dict]] = None


# ── Admin-specific schemas ────────────────────────────────────────────────────

class AdminAttendanceSummary(BaseModel):
    """Aggregated KPI summary for admin dashboard."""
    total_enrolled: int
    total_present: int
    total_late: int
    total_absent: int
    total_missed: int
    active_sessions_count: int
    participation_rate: float
    completion_rate: float
    late_percentage: float
    trend_data: Optional[List[dict]] = None
    completion_data: Optional[List[dict]] = None


class LiveSessionInfo(BaseModel):
    """A currently-active attendance session with training context."""
    session_id: UUID
    training_id: UUID
    training_title: str
    trainer_name: Optional[str]
    opens_at: datetime
    closes_at: datetime
    grace_period_end: datetime
    enrolled_count: int
    marked_count: int
    participation_rate: float


class AttendanceLogEntry(BaseModel):
    """Single attendance log row for admin table."""
    record_id: UUID
    employee_id: UUID
    employee_name: str
    employee_code: Optional[str]
    department_name: Optional[str]
    training_id: UUID
    training_title: str
    status: AttendanceStatus
    marked_at: Optional[datetime]
    device_info: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

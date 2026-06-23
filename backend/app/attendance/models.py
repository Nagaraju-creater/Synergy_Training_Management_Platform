import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    LATE = "LATE"
    ABSENT = "ABSENT"
    PARTIAL = "PARTIAL"


class AttendanceSession(BaseModel):
    """
    Represents a specific window of time where attendance is active for a training.
    """
    __tablename__ = "attendance_sessions"

    training_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trainings.id", ondelete="CASCADE"), nullable=False, index=True)
    opens_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    closes_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    grace_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # Time until which it is 'PRESENT', after which it's 'LATE'
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    secure_token: Mapped[Optional[str]] = mapped_column(String(10), unique=True, index=True, nullable=True)

    # Relationships
    training = relationship("Training", back_populates="attendance_sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(BaseModel):
    """
    The actual attendance record for an employee.
    """
    __tablename__ = "attendance_records"

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    training_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trainings.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("attendance_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    status: Mapped[AttendanceStatus] = mapped_column(SAEnum(AttendanceStatus, values_callable=lambda x: [e.name for e in x]), default=AttendanceStatus.ABSENT, nullable=False, index=True)
    marked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Required by user
    attendance_open_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    attendance_close_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Metadata
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    employee = relationship("Employee", backref="attendance_records")
    training = relationship("Training", back_populates="attendance_records")
    session = relationship("AttendanceSession", back_populates="records")
    logs = relationship("AttendanceLog", back_populates="record", cascade="all, delete-orphan")


class AttendanceLog(BaseModel):
    """
    Audit log for attendance changes.
    """
    __tablename__ = "attendance_logs"

    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # MARKED, UPDATED, OVERRIDDEN
    performed_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    old_status: Mapped[Optional[AttendanceStatus]] = mapped_column(SAEnum(AttendanceStatus, values_callable=lambda x: [e.name for e in x]), nullable=True)
    new_status: Mapped[AttendanceStatus] = mapped_column(SAEnum(AttendanceStatus, values_callable=lambda x: [e.name for e in x]), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    record = relationship("AttendanceRecord", back_populates="logs")

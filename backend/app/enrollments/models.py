import enum
from datetime import date

from sqlalchemy import Enum as SAEnum, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
import uuid

from app.models.base import BaseModel


class EnrollmentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "enrolled"
    REJECTED = "rejected"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"


class Enrollment(BaseModel):
    __tablename__ = "enrollments"

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    training_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trainings.id"), nullable=False, index=True)
    status: Mapped[EnrollmentStatus] = mapped_column(SAEnum(EnrollmentStatus, values_callable=lambda x: [e.name for e in x]), default=EnrollmentStatus.PENDING, nullable=False, index=True)
    completion_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    withdrawal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="enrollments")
    training = relationship("Training", back_populates="enrollments")
    approver = relationship("User", back_populates="approved_enrollments")
    # attendance_records = relationship("AttendanceRecord", backref="enrollment", cascade="all, delete-orphan")
    effectiveness_evaluation = relationship("Effectiveness", back_populates="enrollment", uselist=False, cascade="all, delete-orphan")

    @property
    def employee_name(self) -> Optional[str]:
        if self.employee:
            return f"{self.employee.first_name} {self.employee.last_name}"
        return None

    @property
    def training_title(self) -> Optional[str]:
        if self.training:
            return self.training.title
        return None

    @property
    def training_start_date(self) -> Optional[date]:
        if self.training:
            return self.training.start_date
        return None

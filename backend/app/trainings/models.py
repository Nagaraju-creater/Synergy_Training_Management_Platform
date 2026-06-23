from __future__ import annotations
import enum

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid
from datetime import date, datetime

from app.models.base import BaseModel
from app.departments.models import Department
from app.effectiveness.reviews import DepartmentReview
from app.trainings.documents import TrainingDocument


# Association table for Training and Department many-to-many relationship
training_departments = Table(
    "training_departments",
    BaseModel.metadata,
    Column("training_id", UUID(as_uuid=True), ForeignKey("trainings.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True),
)


class TrainingType(str, enum.Enum):
    INTERNAL = "INTERNAL"
    EXTERNAL = "EXTERNAL"
    ONLINE = "ONLINE"
    WORKSHOP = "WORKSHOP"
    CERTIFICATION = "CERTIFICATION"


class TrainingStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DeliveryMode(str, enum.Enum):
    ONLINE = "ONLINE"
    IN_PERSON = "IN_PERSON"
    HYBRID = "HYBRID"


class Training(BaseModel):
    __tablename__ = "trainings"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    training_type: Mapped[TrainingType] = mapped_column(SAEnum(TrainingType, values_callable=lambda x: [e.name for e in x]), nullable=False, default=TrainingType.INTERNAL)
    delivery_mode: Mapped[DeliveryMode] = mapped_column(SAEnum(DeliveryMode, values_callable=lambda x: [e.name for e in x]), nullable=False, default=DeliveryMode.ONLINE)
    status: Mapped[TrainingStatus] = mapped_column(SAEnum(TrainingStatus, values_callable=lambda x: [e.name for e in x]), default=TrainingStatus.DRAFT, nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    start_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # e.g. "10:00 AM"
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    duration_hours: Mapped[float] = mapped_column(Float, nullable=False, default=2.0)
    max_hours_allowed: Mapped[float] = mapped_column(Float, nullable=False, default=2.0)
    max_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    available_seats: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    enrollment_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    venue: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    meeting_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    trainer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_archived: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_global: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_attendance_enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    skills_covered: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Comma separated skills
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("training_categories.id"), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    departments: Mapped[List["Department"]] = relationship("Department", secondary=training_departments, back_populates="trainings")
    category = relationship("TrainingCategory", back_populates="trainings")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_trainings")
    enrollments = relationship("Enrollment", back_populates="training", cascade="all, delete-orphan")
    nominations = relationship("Nomination", back_populates="training", cascade="all, delete-orphan")
    effectiveness_records = relationship("Effectiveness", back_populates="training", cascade="all, delete-orphan")
    department_reviews = relationship("DepartmentReview", back_populates="training", cascade="all, delete-orphan")
    documents = relationship("TrainingDocument", back_populates="training", cascade="all, delete-orphan")
    attendance_sessions = relationship("AttendanceSession", back_populates="training", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="training", cascade="all, delete-orphan")

    @property
    def eligible_departments(self) -> List[str]:
        if self.is_global:
            return ["All Departments"]
        try:
            return [d.name for d in self.departments]
        except Exception:
            return []


class TrainingImportHistory(BaseModel):
    __tablename__ = "training_import_history"

    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    records_imported: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_skipped: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source_file: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    imported_by = relationship("User", foreign_keys=[created_by])




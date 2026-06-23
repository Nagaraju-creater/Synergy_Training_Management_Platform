import enum

from sqlalchemy import Date, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
import uuid
from datetime import date

from app.models.base import BaseModel


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"


class Employee(BaseModel):
    __tablename__ = "employees"

    employee_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    sub_department: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    designation: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    legal_entity: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    profile_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    date_of_joining: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[EmploymentStatus] = mapped_column(SAEnum(EmploymentStatus, values_callable=lambda x: [e.name for e in x]), default=EmploymentStatus.ACTIVE, nullable=False)
    streak_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="employee")
    department = relationship("Department", foreign_keys=[department_id], back_populates="employees")
    manager = relationship("Employee", remote_side="Employee.id", foreign_keys=[manager_id])
    enrollments = relationship("Enrollment", back_populates="employee", cascade="all, delete-orphan")
    nominations = relationship("Nomination", foreign_keys="[Nomination.employee_id]", back_populates="employee", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="employee", cascade="all, delete-orphan")
    leaderboard_points = relationship("LeaderboardPoint", back_populates="employee", cascade="all, delete-orphan")


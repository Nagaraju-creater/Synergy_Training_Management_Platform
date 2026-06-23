from sqlalchemy import ForeignKey, String, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
import uuid
from datetime import date

from app.models.base import BaseModel
from app.effectiveness.reviews import DepartmentReview # Fixed: Resolve mapping relationship


class Department(BaseModel):
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    head_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)

    # Relationships
    employees = relationship("Employee", foreign_keys="[Employee.department_id]", back_populates="department")
    trainings = relationship("Training", secondary="training_departments", back_populates="departments")
    department_heads_history = relationship("DepartmentHead", back_populates="department", cascade="all, delete-orphan")
    reviews = relationship("DepartmentReview", back_populates="department", cascade="all, delete-orphan")


class DepartmentHead(BaseModel):
    __tablename__ = "department_heads"

    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    department = relationship("Department", back_populates="department_heads_history")
    employee = relationship("Employee", foreign_keys=[employee_id])

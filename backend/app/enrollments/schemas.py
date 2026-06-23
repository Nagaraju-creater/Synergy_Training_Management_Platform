from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.enrollments.models import EnrollmentStatus
from app.employees.schemas import EmployeeResponse


class EnrollmentCreate(BaseModel):
    employee_id: UUID
    training_id: UUID


class EnrollmentUpdate(BaseModel):
    status: Optional[EnrollmentStatus] = None
    completion_score: Optional[float] = None
    feedback: Optional[str] = None


class WithdrawRequest(BaseModel):
    reason: str  # Required — employee must provide a withdrawal reason


class EnrollmentResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    employee: Optional[EmployeeResponse] = None
    training_id: UUID
    training_title: Optional[str] = None
    training_start_date: Optional[date] = None
    status: EnrollmentStatus
    progress: float = 0.0
    completion_score: Optional[float] = None
    feedback: Optional[str] = None
    withdrawal_reason: Optional[str] = None
    approved_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

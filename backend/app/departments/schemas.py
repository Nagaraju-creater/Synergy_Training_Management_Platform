from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    head_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None


class DepartmentResponse(DepartmentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    employee_count: Optional[int] = 0
    total_training_hours: Optional[float] = 0.0

    model_config = {"from_attributes": True}


class DepartmentAnalytics(BaseModel):
    month: str
    training_hours: float
    employee_count: int

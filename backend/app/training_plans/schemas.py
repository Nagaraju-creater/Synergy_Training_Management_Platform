from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field
from app.training_plans.models import TrainingPlanStatus
from app.trainings.schemas import TrainingCategoryResponse
from app.departments.schemas import DepartmentResponse

class TrainingPlanBase(BaseModel):
    training_title: str
    category_id: UUID
    planned_date: date
    department_id: Optional[UUID] = None
    description: Optional[str] = None
    financial_year: str

class TrainingPlanCreate(TrainingPlanBase):
    pass

class TrainingPlanUpdate(BaseModel):
    training_title: Optional[str] = None
    category_id: Optional[UUID] = None
    planned_date: Optional[date] = None
    department_id: Optional[UUID] = None
    description: Optional[str] = None
    financial_year: Optional[str] = None
    status: Optional[TrainingPlanStatus] = None

class TrainingPlanResponse(TrainingPlanBase):
    id: UUID
    status: TrainingPlanStatus
    converted_training_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    category: Optional[TrainingCategoryResponse] = None
    department: Optional[DepartmentResponse] = None

    model_config = {"from_attributes": True}

class DepartmentWiseCount(BaseModel):
    department_name: str
    count: int

class TrainingPlanStats(BaseModel):
    total_planned: int
    converted: int
    completed: int
    pending: int
    department_wise_counts: List[DepartmentWiseCount]

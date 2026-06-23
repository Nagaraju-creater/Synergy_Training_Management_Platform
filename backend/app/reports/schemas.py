from typing import Optional
from datetime import date
from pydantic import BaseModel

class ReportFilters(BaseModel):
    department_id: Optional[str] = None
    employee_id: Optional[str] = None
    training_id: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    min_completion_rate: Optional[float] = None
    month: Optional[int] = None
    year: Optional[int] = None
    quarter: Optional[int] = None

class TrainingSummaryReport(BaseModel):
    total_trainings: int
    completed_trainings: int
    ongoing_trainings: int
    total_enrollments: int
    completion_rate: float

class DepartmentReportRow(BaseModel):
    department_name: str
    total_employees: int
    enrolled: int
    completed: int
    completion_rate: float

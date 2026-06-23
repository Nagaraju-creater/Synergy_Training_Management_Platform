from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime


class TeamKPIs(BaseModel):
    total_learning_hours: float
    completion_rate: float          # 0–100
    active_learners: int
    top_performing_department: str
    avg_hours_per_employee: float
    total_employees: int
    total_enrollments: int
    total_completed: int

    total_target_hours: float
    total_actual_hours: float
    remaining_hours: float
    learning_compliance_pct: float
    employees_achieved_goal: int
    employees_below_target: int

    total_attendance_pct: float
    learning_hours_generated: float
    missed_learning_hours: float
    training_participation_pct: float


class DeptLearningHours(BaseModel):
    department: str
    hours: float
    employees: int
    completion_rate: float


class MonthlyLearningTrend(BaseModel):
    month: str
    hours: float
    enrollments: int
    completions: int


class CourseParticipation(BaseModel):
    course: str
    participants: int
    completion_rate: float


class SkillGapItem(BaseModel):
    skill: str
    current: float  # 0–100
    target: float   # 0–100


class EffectivenessScore(BaseModel):
    department: str
    score: float    # 0–100


class DepartmentSummary(BaseModel):
    department: str
    top_learner: str
    total_hours: float
    completion_pct: float
    active_enrollments: int
    pending_evaluations: int
    employee_count: int


class EmployeeAnalyticsRow(BaseModel):
    id: str
    name: str
    department: str
    total_hours: float
    trainings_completed: int
    completion_pct: float
    effectiveness_score: float
    last_active: Optional[str]


class TopLearner(BaseModel):
    rank: int
    id: str
    name: str
    department: str
    hours: float
    completions: int
    avatar_initials: str


class TeamAnalyticsDashboard(BaseModel):
    kpis: TeamKPIs
    dept_learning_hours: List[DeptLearningHours]
    monthly_trends: List[MonthlyLearningTrend]
    course_participation: List[CourseParticipation]
    skill_gaps: List[SkillGapItem]
    effectiveness_scores: List[EffectivenessScore]
    department_summaries: List[DepartmentSummary]
    employee_table: List[EmployeeAnalyticsRow]
    top_learners_company: List[TopLearner]
    executive_insights: List[str]

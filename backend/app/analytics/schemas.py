from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class AnalyticsSummary(BaseModel):
    total_employees: int
    total_trainings: int
    total_enrollments: int
    avg_completion_rate: float
    trainings_this_month: int

class MonthlyEngagement(BaseModel):
    month: str
    trainings: int
    enrollments: int

class DepartmentPerformance(BaseModel):
    dept: str
    rate: float
    hours: float = 0.0

class AnalyticsCharts(BaseModel):
    monthly_engagement: List[MonthlyEngagement]
    department_performance: List[DepartmentPerformance]

# --- Dashboard Specific Schemas ---

class SkillProgress(BaseModel):
    skill: str
    level: int
    progress: int # 0-100

class LearningContribution(BaseModel):
    training_title: str
    hours: float
    completed_on: Optional[date] = None

class AnnualLearningGoal(BaseModel):
    goal_hours: float
    completed_hours: float
    remaining_hours: float
    progress_percentage: float
    progress_state: str
    financial_year_label: str
    financial_year_start: date
    financial_year_end: date
    last_completed_course: Optional[str] = None
    recent_contribution: Optional[LearningContribution] = None

class EmployeeDashboardData(BaseModel):
    active_courses_count: int
    completed_courses_count: int
    missed_courses_count: int
    overall_progress: int
    upcoming_deadlines: List[dict] # {title: str, due_date: date}
    weekly_calendar: List[dict] # {day: str, event: str}
    skills: List[SkillProgress]
    points: int
    streak_days: int
    badges_count: int
    recommendations: List[dict] # {id: str, title: str, type: str}
    pending_effectiveness: int
    annual_learning_goal: AnnualLearningGoal

class TeamMemberProgress(BaseModel):
    id: str
    name: str
    department: str
    completion_rate: float
    status: str # 'active', 'overdue', 'at-risk'
    hours_completed: float

class ManagerDashboardData(BaseModel):
    team_progress: List[TeamMemberProgress]
    avg_completion_rate: float
    overdue_count: int
    at_risk_count: int
    total_team_hours: float
    pending_reviews_count: int
    activity_feed: List[dict] # {user: str, action: str, time: str}
    completion_stats: dict # {completed: int, ongoing: int, dropped: int}

class AdminDashboardData(BaseModel):
    summary: AnalyticsSummary
    compliance_percentage: float
    skills_gap: List[dict] # {skill: str, gap: float}
    department_hours: List[dict] # {dept: str, hours: float}
    monthly_trends: List[MonthlyEngagement]
    roi_metrics: dict # {cost: float, savings: float, ratio: float}
    top_trainings: List[dict] # {title: str, completions: int}
    top_departments: List[dict] # {name: str, performance: float}
    pending_nominations: int
    pending_reviews: int
    learning_goal: dict

class ManagerSummary(BaseModel):
    team_count: int
    active_trainings: int
    pending_nominations: int
    overdue_employees: int
    team_learning_hours_fy: float = 0.0
    learning_goal_completion_percentage: float = 0.0
    employees_below_learning_target: int = 0
    financial_year_label: str = ""
    avg_completion_rate: Optional[float] = None

class ParticipationChart(BaseModel):
    training_name: str
    participation_count: int

class ManagerCharts(BaseModel):
    completion_rate: dict # {completed: int, pending: int}
    participation: List[ParticipationChart]

class TeamMemberRow(BaseModel):
    id: str
    name: str
    department: str
    trainings_assigned: int
    completion_percentage: float
    status: str # 'On track', 'At risk'
    learning_hours_fy: float = 0.0
    learning_goal_progress: float = 0.0
    below_learning_target: bool = True

class TeamDataResponse(BaseModel):
    members: List[TeamMemberRow]
    total_count: int

class PendingReviewRow(BaseModel):
    id: str
    employee_name: str
    training_name: str
    submission_date: datetime

class ManagerDashboardActivity(BaseModel):
    type: str # 'nomination', 'completion', 'submission'
    user: str
    detail: str
    time: datetime

class UnifiedManagerDashboard(BaseModel):
    summary: ManagerSummary
    charts: ManagerCharts
    team: TeamDataResponse
    activity: List[ManagerDashboardActivity]
    pending_reviews: List[PendingReviewRow]
    leaderboard: List[TeamMemberRow]

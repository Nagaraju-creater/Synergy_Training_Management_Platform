from app.users.models import User
from app.roles.models import Role
from app.employees.models import Employee
from app.departments.models import Department, DepartmentHead
from app.trainings.models import Training, TrainingImportHistory
from app.trainings.categories import TrainingCategory
from app.trainings.documents import TrainingDocument
from app.enrollments.models import Enrollment
from app.nominations.models import Nomination
from app.effectiveness.models import Effectiveness
from app.effectiveness.reviews import DepartmentReview
from app.attendance.models import AttendanceSession, AttendanceRecord, AttendanceLog
from app.notifications.models import Notification
from app.signatures.models import DigitalSignature
from app.gamification.models import Achievement, LeaderboardPoint
from app.audit.models import AuditLog
from app.analytics.models import AnalyticsSnapshot
from app.training_plans.models import TrainingPlan
from app.learning_hub.models import LearningCategory, LearningModule, LearningMaterial
from app.system_settings.models import SystemSetting

# Standardized list of all models for registration purposes
ALL_MODELS = [
    SystemSetting,
    User,
    Role,
    Employee,
    Department,
    DepartmentHead,
    Training,
    TrainingImportHistory,
    TrainingCategory,
    TrainingDocument,
    Enrollment,
    Nomination,
    Effectiveness,
    DepartmentReview,
    AttendanceSession,
    AttendanceRecord,
    AttendanceLog,
    Notification,
    DigitalSignature,
    Achievement,
    LeaderboardPoint,
    AuditLog,
    AnalyticsSnapshot,
    TrainingPlan,
    LearningCategory,
    LearningModule,
    LearningMaterial
]



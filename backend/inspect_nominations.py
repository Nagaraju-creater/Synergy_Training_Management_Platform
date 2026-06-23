import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.users.models import User
from app.roles.models import Role
from app.employees.models import Employee
from app.departments.models import Department, DepartmentHead
from app.nominations.models import Nomination
from app.trainings.models import Training
from app.effectiveness.models import Effectiveness
from app.signatures.models import DigitalSignature
from app.notifications.models import Notification
from app.enrollments.models import Enrollment
from app.audit.models import AuditLog
from app.attendance.models import Attendance
from app.gamification.models import Achievement, LeaderboardPoint
from app.analytics.models import AnalyticsSnapshot
from app.trainings.categories import TrainingCategory
from app.effectiveness.reviews import DepartmentReview
from sqlalchemy.orm import selectinload

# Import everything to avoid relationship issues
from app.trainings.models import Training
from app.effectiveness.models import Effectiveness
from app.signatures.models import DigitalSignature
from app.notifications.models import Notification
from app.enrollments.models import Enrollment
from app.audit.models import AuditLog
from app.attendance.models import Attendance
from app.gamification.models import Achievement, LeaderboardPoint
from app.analytics.models import AnalyticsSnapshot
from app.trainings.categories import TrainingCategory
from app.effectiveness.reviews import DepartmentReview

async def inspect_nominations():
    async with AsyncSessionLocal() as db:
        print("\n" + "="*100)
        print(f"{'TRAINING':<25} | {'NOMINEE':<20} | {'NOMINATED BY':<20} | {'STATUS':<20}")
        print("-" * 100)
        
        stmt = select(Nomination).options(
            selectinload(Nomination.training),
            selectinload(Nomination.employee),
            selectinload(Nomination.nominator)
        )
        res = await db.execute(stmt)
        nominations = res.scalars().all()
        
        for n in nominations:
            training = n.training.title if n.training else "N/A"
            nominee = f"{n.employee.first_name} {n.employee.last_name}" if n.employee else "N/A"
            
            # Find nominator name
            nominator_name = "N/A"
            if n.nominated_by:
                u_res = await db.execute(select(User).where(User.id == n.nominated_by))
                u = u_res.scalar_one_or_none()
                if u:
                    nominator_name = u.full_name
            
            print(f"{training:<25} | {nominee:<20} | {nominator_name:<20} | {n.status:<20}")
        print("="*100 + "\n")

if __name__ == "__main__":
    asyncio.run(inspect_nominations())

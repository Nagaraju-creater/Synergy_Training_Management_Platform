from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.gamification.models import LeaderboardPoint, Achievement
from app.employees.models import Employee

class GamificationService:
    @staticmethod
    async def award_points(db: AsyncSession, employee_id: UUID, points: int, reason: str):
        lp = LeaderboardPoint(employee_id=employee_id, points=points, reason=reason)
        db.add(lp)
        
        # Update streak count (dummy logic: increment if awarded today)
        employee = await db.get(Employee, employee_id)
        if employee:
            employee.streak_count += 1
            
        await db.flush()

    @staticmethod
    async def award_achievement(db: AsyncSession, employee_id: UUID, title: str, description: str):
        a = Achievement(employee_id=employee_id, title=title, description=description)
        db.add(a)
        await db.flush()

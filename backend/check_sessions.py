import asyncio
import app.models.registry  # Import early to avoid Mapper Registry errors
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.attendance.models import AttendanceSession
from app.trainings.models import Training

async def main():
    async with AsyncSessionLocal() as db:
        stmt = select(AttendanceSession).join(Training)
        result = await db.execute(stmt)
        sessions = result.scalars().all()
        print(f"Total sessions: {len(sessions)}")
        for s in sessions:
            print(f"ID: {s.id}, secure_token: {s.secure_token}, training_id: {s.training_id}, opens_at: {s.opens_at}, closes_at: {s.closes_at}, is_active: {s.is_active}")

if __name__ == "__main__":
    asyncio.run(main())

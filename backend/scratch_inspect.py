import asyncio
from datetime import datetime
from app.database import AsyncSessionLocal
from app.trainings.models import Training, TrainingStatus
from app.trainings.categories import TrainingCategory
from app.trainings.service import _compute_status
from sqlalchemy import select

# Import all models to prevent configuration issues in SQLAlchemy
import app.models.registry  # noqa: F401

async def f():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Training))
        trainings = res.scalars().all()
        print(f"Current time: {datetime.now().strftime('%Y-%m-%d %I:%M %p')}\n")
        print(f"{'Title':<35} {'Start':<25} {'End Date':<12} {'Duration':>8}  {'DB Status':<12}  {'Computed Status'}")
        print("-" * 110)
        for t in trainings:
            computed = _compute_status(t)
            mismatch = " <<<< MISMATCH" if computed != t.status else ""
            print(
                f"{t.title:<35} "
                f"{str(t.start_date) + ' ' + str(t.start_time or ''):<25} "
                f"{str(t.end_date):<12} "
                f"{t.duration_hours:>8.1f}h  "
                f"{t.status.value:<12}  "
                f"{computed.value}{mismatch}"
            )

if __name__ == "__main__":
    asyncio.run(f())

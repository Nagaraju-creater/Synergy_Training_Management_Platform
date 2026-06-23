import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry # Import registry to avoid InvalidRequestError
from app.trainings.models import Training

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Training).order_by(Training.created_at.desc()).limit(10))
        trainings = res.scalars().all()
        print(f"Recent trainings in DB:")
        for t in trainings:
            print(f"- {t.title} (ID: {t.id}, Status: {t.status}, Archived: {t.is_archived}, Created: {t.created_at})")

if __name__ == "__main__":
    asyncio.run(check())

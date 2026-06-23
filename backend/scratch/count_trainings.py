import asyncio
from sqlalchemy import func, select
from app.database import AsyncSessionLocal
import app.models.registry # FIXED
from app.trainings.models import Training

async def check():
    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count(Training.id)))).scalar()
        print(f"Total Trainings: {count}")

if __name__ == "__main__":
    asyncio.run(check())

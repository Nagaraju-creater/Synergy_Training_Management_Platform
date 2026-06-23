import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry
from app.trainings.models import Training

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Training).where(Training.title == "Advanced Communication"))
        t = res.scalar_one_or_none()
        if t:
            print(f"Details for '{t.title}':")
            print(f"  ID: {t.id}")
            print(f"  Status: {t.status}")
            print(f"  Archived: {t.is_archived}")
            print(f"  Department ID: {t.department_id}")
            print(f"  Category ID: {t.category_id}")
            print(f"  Delivery Mode: {t.delivery_mode}")
            print(f"  Trainer: {t.trainer_name}")
        else:
            print("Training not found")

if __name__ == "__main__":
    asyncio.run(check())

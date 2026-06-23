import asyncio
from app.database import AsyncSessionLocal
import app.models.registry
from app.trainings.service import TrainingService

async def test_get_all():
    async with AsyncSessionLocal() as db:
        trainings, total = await TrainingService.get_all(
            db, 
            page=1, 
            per_page=20, 
            category_id=None,
            department_id=None,
            status=None,
            training_type=None,
            search=None,
            include_archived=False
        )
        print(f"Total returned from service: {total}")
        print(f"Items returned: {len(trainings)}")

if __name__ == "__main__":
    asyncio.run(test_get_all())

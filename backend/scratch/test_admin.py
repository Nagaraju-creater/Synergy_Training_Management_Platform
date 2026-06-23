import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import app.models.registry
from app.analytics.service import AnalyticsService
from app.config import settings

async def test_admin():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            print("Calling get_admin_dashboard...")
            data = await AnalyticsService.get_admin_dashboard(db)
            print("Success:", data.model_dump())
        except Exception as e:
            import traceback
            print("Error caught:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_admin())

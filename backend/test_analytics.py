import asyncio
# Import all models early to ensure SQLAlchemy mapper registry is complete
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from app.analytics.team_analytics_service import TeamAnalyticsService

async def main():
    async with AsyncSessionLocal() as db:
        try:
            data = await TeamAnalyticsService.get_team_dashboard(
                db=db,
                financial_year="2025-2026",
                quarter="All",
                month=None,
                department_id=None,
                employee_id=None,
                manager_id=None,
                training_category_id=None,
                training_type=None,
            )
            print("Success!")
            print("KPIs:", data.kpis.model_dump())
            print("Executive Insights:", data.executive_insights)
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from app.analytics.team_analytics_service import TeamAnalyticsService

async def main():
    async with AsyncSessionLocal() as db:
        try:
            print("Generating Excel report...")
            excel_bytes = await TeamAnalyticsService.generate_kpi_excel(
                db=db,
                financial_year="2025-2026",
            )
            with open("test_excel_output.xlsx", "wb") as f:
                f.write(excel_bytes)
            print("Success! File saved to test_excel_output.xlsx")
        except Exception as e:
            print(f"Error during Excel generation: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

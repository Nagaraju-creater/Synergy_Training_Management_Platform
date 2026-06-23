import asyncio
from sqlalchemy import delete
from app.database import AsyncSessionLocal
from app.users.models import User

async def clean_users():
    async with AsyncSessionLocal() as db:
        print("🧹 Cleaning users for re-seed...")
        await db.execute(delete(User))
        await db.commit()
        print("✅ Users table cleared.")

if __name__ == "__main__":
    asyncio.run(clean_users())

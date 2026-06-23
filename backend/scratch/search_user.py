import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry
from app.users.models import User

async def search_user(pattern):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email.ilike(f"%{pattern}%")))
        users = res.scalars().all()
        print("Found users:")
        for u in users:
            print(f"- Email: '{u.email}', Name: {u.full_name}, ID: {user.id if 'user' in locals() else u.id}")

if __name__ == "__main__":
    asyncio.run(search_user("balanbalraj"))

import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.users.models import User

async def main():
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        for u in users:
            print(f"{u.email} - role: {u.role_id}")
asyncio.run(main())

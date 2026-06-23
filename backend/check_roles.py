import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.users.models import User
import app.models.registry # noqa: F401

async def main():
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User).options(selectinload(User.role)))).scalars().all()
        for u in users:
            print(f"{u.email} - role: {u.role.name if u.role else 'None'}")

if __name__ == "__main__":
    asyncio.run(main())

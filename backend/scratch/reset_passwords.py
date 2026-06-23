import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry
from app.users.models import User
from app.users.service import UserService
from fastapi.concurrency import run_in_threadpool

async def reset_passwords():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print(f"Resetting passwords for {len(users)} users...")
        
        for u in users:
            # We skip admin if you want, but it's easier to just reset all to known state
            # if u.email == "admin@trainiq.com": continue 
            
            u.hashed_password = await run_in_threadpool(UserService.hash_password, "Welcome@123")
            print(f"  Reset: {u.email}")
            
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(reset_passwords())

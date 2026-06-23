import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry
from app.users.models import User
from app.users.service import UserService
from fastapi.concurrency import run_in_threadpool

async def test_auth(email, password):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == email))
        user = res.scalar_one_or_none()
        if not user:
            print(f"User {email} NOT FOUND in DB")
            return
        
        is_valid = await run_in_threadpool(UserService.verify_password, password, user.hashed_password)
        print(f"User: {user.email}")
        print(f"Role: {user.role_id}")
        print(f"Is Active: {user.is_active}")
        print(f"Password '{password}' is VALID: {is_valid}")

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "iambalakumar.22@gmail.com"
    asyncio.run(test_auth(email, "Welcome@123"))

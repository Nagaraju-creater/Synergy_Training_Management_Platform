import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry # Required to register all models
from app.users.models import User
from app.users.service import UserService
from app.auth.service import AuthService

async def probe_auth():
    async with AsyncSessionLocal() as db:
        email = "admin@trainiq.com"
        password = "admin123"
        
        print(f"--- Probing Auth for {email} ---")
        
        # 1. Direct verify
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print("❌ Error: Admin user not found in DB!")
            return
            
        print(f"Found user: {user.full_name}")
        print(f"Hash in DB: {user.hashed_password}")
        
        is_valid = UserService.verify_password(password, user.hashed_password)
        print(f"UserService.verify_password: {is_valid}")
        
        # 2. AuthService authenticate
        try:
            auth_user = await AuthService.authenticate(db, email, password)
            print("✅ AuthService.authenticate: SUCCESS")
        except Exception as e:
            print(f"❌ AuthService.authenticate: FAILED - {str(e)}")

if __name__ == "__main__":
    asyncio.run(probe_auth())

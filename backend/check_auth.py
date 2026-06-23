import asyncio
import bcrypt
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT email, hashed_password, is_active FROM users WHERE email = 'admin@trainiq.com'"))
        row = r.fetchone()
        if row:
            email, pw_hash, is_active = row
            print(f"Email: {email}")
            print(f"Is active: {is_active}")
            print(f"Stored hash: {pw_hash}")
            try:
                result = bcrypt.checkpw("Welcome@123".encode(), pw_hash.encode())
                print(f"'Welcome@123' verify: {result}")
            except Exception as e:
                print(f"bcrypt error: {e}")
        else:
            print("User NOT found")

asyncio.run(check())

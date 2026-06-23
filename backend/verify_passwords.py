import asyncio
import bcrypt
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.users.models import User
import app.models.registry  # Import all models to resolve mapper dependencies

async def verify():
    target_email = "admin@example.com"
    passwords_to_test = ["Welcome@123", "Admin@123", "password123", "manager123", "admin123"]
    
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == target_email))
        user = res.scalar_one_or_none()
        
        if not user:
            print(f"User {target_email} not found in database.")
            return

        print(f"Checking user: {user.full_name} ({user.email})")
        
        for plain in passwords_to_test:
            try:
                is_valid = bcrypt.checkpw(plain.encode('utf-8'), user.hashed_password.encode('utf-8'))
                if is_valid:
                    print(f" MATCH FOUND! Password is: '{plain}'")
                    return
                else:
                    print(f" [X] '{plain}' is NOT correct.")
            except Exception as e:
                print(f" Error checking '{plain}': {e}")
        
        print("\nNone of the common passwords matched. The password might have been changed or seeded with something else.")

if __name__ == "__main__":
    asyncio.run(verify())

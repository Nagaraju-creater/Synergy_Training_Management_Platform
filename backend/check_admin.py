import asyncio
import bcrypt
from sqlalchemy import text


async def check():
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        # Look for any admin-like or example.com users
        r = await db.execute(text(
            "SELECT email, hashed_password, is_active FROM users ORDER BY email LIMIT 20"
        ))
        rows = r.fetchall()
        if not rows:
            print("NO USERS FOUND IN DATABASE")
            return

        print(f"Found {len(rows)} user(s):")
        for row in rows:
            email, pw_hash, is_active = row
            print(f"\n  Email: {email}  |  active={is_active}")
            if pw_hash:
                try:
                    match = bcrypt.checkpw(b"Welcome@123", pw_hash.encode())
                    print(f"  'Welcome@123' matches: {match}")
                except Exception as e:
                    print(f"  bcrypt error: {e}")
            else:
                print("  !! NO PASSWORD HASH STORED !!")


asyncio.run(check())

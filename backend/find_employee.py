import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def find_and_delete():
    async with AsyncSessionLocal() as db:
        # Find the record
        r = await db.execute(text("""
            SELECT e.id, e.employee_id, e.first_name, e.last_name, e.email, e.job_title, e.department_id, u.email as user_email
            FROM employees e
            LEFT JOIN users u ON u.id = e.user_id
            WHERE LOWER(e.first_name) LIKE '%team%' OR LOWER(e.last_name) LIKE '%team%'
               OR LOWER(e.job_title) LIKE '%team manage%'
               OR LOWER(e.first_name) LIKE '%manage%' OR LOWER(e.last_name) LIKE '%manage%'
            ORDER BY e.first_name
        """))
        rows = r.fetchall()
        if not rows:
            print("No matching employee found.")
        else:
            print(f"Found {len(rows)} match(es):")
            for row in rows:
                print(f"  id={row[0]}  emp_id={row[1]}  name={row[2]} {row[3]}  email={row[4]}  job_title={row[5]}  user_email={row[7]}")

asyncio.run(find_and_delete())

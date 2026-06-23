
import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, employee_id, training_id FROM enrollments"))
        rows = res.all()
        print(f"Enrollments: {len(rows)}")
        for r in rows:
            print(f"Enrollment {r.id}: Emp {r.employee_id}, Training {r.training_id}")
            
            emp = await conn.execute(text(f"SELECT id, first_name, last_name FROM employees WHERE id = '{r.employee_id}'"))
            e_row = emp.first()
            print(f"  -> Employee: {e_row}")
            
            trn = await conn.execute(text(f"SELECT id, title FROM trainings WHERE id = '{r.training_id}'"))
            t_row = trn.first()
            print(f"  -> Training: {t_row}")

if __name__ == "__main__":
    asyncio.run(main())

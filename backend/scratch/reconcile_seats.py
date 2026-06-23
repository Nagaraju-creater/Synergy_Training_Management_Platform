
import asyncio
from app.database import engine
from sqlalchemy import text
from app.trainings.models import Training
from app.enrollments.models import Enrollment, EnrollmentStatus
from sqlalchemy import select, func

async def reconcile_seats():
    async with engine.begin() as conn:
        # Get all trainings
        res = await conn.execute(text("SELECT id, max_participants FROM trainings"))
        trainings = res.all()
        
        # Determine the string representation of WITHDRAWN in DB
        # Usually it's either 'withdrawn' or 'WITHDRAWN'
        # Let's try to fetch one enrollment to see the case if possible
        
        for t_id, max_p in trainings:
            if max_p is None:
                continue
                
            # Count non-withdrawn enrollments
            # Using EnrollmentStatus.WITHDRAWN.value might work if the enum is mapped correctly
            # But since the user had issues before, let's use a safe approach
            
            count_res = await conn.execute(
                text("SELECT count(*) FROM enrollments WHERE training_id = :tid AND status::text NOT IN ('withdrawn', 'WITHDRAWN')"),
                {"tid": t_id}
            )
            enrolled = count_res.scalar()
            
            new_available = max_p - enrolled
            print(f"Training {t_id}: Max {max_p}, Enrolled {enrolled} -> Available {new_available}")
            
            await conn.execute(
                text("UPDATE trainings SET available_seats = :avail WHERE id = :tid"),
                {"avail": new_available, "tid": t_id}
            )

if __name__ == "__main__":
    asyncio.run(reconcile_seats())

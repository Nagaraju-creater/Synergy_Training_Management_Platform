import asyncio
import json
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from app.departments.service import DepartmentService
from app.departments.schemas import DepartmentResponse
from fastapi.encoders import jsonable_encoder

async def main():
    async with AsyncSessionLocal() as db:
        depts, total = await DepartmentService.get_all(db, 1, 100)
        print(f"Total departments from service: {total}")
        
        data = [DepartmentResponse.model_validate(d).model_dump() for d in depts]
        print("Serialized data:")
        print(json.dumps(jsonable_encoder(data), indent=2))

if __name__ == "__main__":
    asyncio.run(main())

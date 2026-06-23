import asyncio
import datetime
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.registry import *
from app.employees.models import Employee, EmploymentStatus
from app.departments.models import Department

data = [
    {"emp_no": "001", "name": "Sagar Ramesh", "email": "sagarramesh592@gmail.com", "doj": "2022-06-28", "title": "Senior Engineer - Production", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "003", "name": "Megha Lakshmi Murugamani", "email": "aishumegha95@gmail.com", "doj": "2022-10-01", "title": "Team Member - Customer Co-ordination", "dept": "CRM - Department", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Prakash Padukone Muthiah"},
    {"emp_no": "005", "name": "Arunkumar Selvaraj", "email": "arunsr.1993@gmail.com", "doj": "2023-04-01", "title": "Assistant Manager - Castings Business", "dept": "NPD", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "R Rathina Kumar"},
    {"emp_no": "006", "name": "Nallini Vasudevan", "email": "nalinivasu11@gmail.com", "doj": "2023-04-01", "title": "Team Member - Stores", "dept": "Stores", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Sakthivel Muthu"},
    {"emp_no": "007", "name": "Naveenkumar M", "email": "naveen@synergyglobal.in", "doj": "2023-04-01", "title": "Asst. Manager - NPD", "dept": "NPD", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Prakash Padukone Muthiah"},
    {"emp_no": "008", "name": "Nethaji Raja", "email": "qacasting@synergyglobal.in", "doj": "2023-04-01", "title": "Assistant Manager - QA (Castings)", "dept": "QA - Castings", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "R Rathina Kumar"},
    {"emp_no": "011", "name": "Mariyaruban Mariyakilaimans", "email": "payables@synergyglobal.in", "doj": "2023-06-30", "title": "Team Member - Accounts & Admin", "dept": "Accounts", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Arunachalam Palaniappan"},
    {"emp_no": "013", "name": "Govindammal", "email": "ggovindammal64@gmail.com", "doj": "2023-07-12", "title": "Waste drain valve assembly", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "015", "name": "Sangeetha Murugan", "email": "ponmathimurugan21@gmail.com", "doj": "2023-07-12", "title": "Waste drain valve assembly", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "016", "name": "Gunasekaran Kaveri Setty", "email": "gunasekaran@gmail.com", "doj": "2023-08-21", "title": "Waste drain valve assembly", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "017", "name": "Saravana Hanumanthappa", "email": "itsupport@synergyglobal.in", "doj": "2023-08-21", "title": "Team Member IT-Maintenance", "dept": "IT Support", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Manasa R"},
    {"emp_no": "018", "name": "Perumal Govindharaj", "email": "perumalperumalg01@gmail.com", "doj": "2023-08-28", "title": "Team Member - Assembly", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "020", "name": "Yuvaraj Vijayan", "email": "yuvarajyuva@gmail.com", "doj": "2023-08-28", "title": "Team Member - Assembly", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "021", "name": "C Mohankumar", "email": "maintenance@synergyglobal.in", "doj": "2023-08-30", "title": "Maintenance - Engineer", "dept": "Maintenance", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Manasa R"},
    {"emp_no": "023", "name": "Murthy K", "email": "murthy2002k@gmail.com", "doj": "2023-11-10", "title": "Team Member - Assembly", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "024", "name": "M Arun", "email": "admincoval@synergyglobal.in", "doj": "2023-11-15", "title": "Engineer - Supply Chain Management", "dept": "QA", "location": "Coimbatore", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "R Rathina Kumar"},
    {"emp_no": "025", "name": "Nandhakumar G", "email": "nandhuganesh555@gmail.com", "doj": "2023-11-15", "title": "NPD Engineer", "dept": "NPD", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Naveenkumar Suresh"},
    {"emp_no": "026", "name": "Surya P", "email": "suryaps10499@gmail.com", "doj": "2023-11-16", "title": "Team member QA", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "028", "name": "Saranya Kuppan", "email": "kuppan1982@gmail.com", "doj": "2025-01-01", "title": "Team Member - Visual Inspection", "dept": "QA", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "029", "name": "Jayesh Nitin Patel", "email": "jayesh@synergyglobal.in", "doj": "2025-05-02", "title": "Executive - Finance (Management Representative)", "dept": "Accounts", "location": "Hosur", "legal": "SYNERGY-GLOBAL MANUFACTEC PRIVATE LIMITED", "manager_name": "Srinivasan Beeman"},
    {"emp_no": "111", "name": "Geetha Gowthaman", "email": "scmcbt@synergyglobal.in", "doj": "2026-04-01", "title": "Assistant Manager - SCM & Admin", "dept": "NPD-Casting", "location": "Coimbatore", "legal": "Synergy Global Sourcing"}
]

async def update_emps():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Employee))
        all_emps = res.scalars().all()
        mgr_dict = {f"{e.first_name} {e.last_name}".strip().lower(): e.id for e in all_emps}
        
        # also try to match manager by first name
        for e in all_emps:
            if f"{e.first_name} {e.last_name}".strip().lower() not in mgr_dict:
                mgr_dict[e.first_name.lower()] = e.id

        for row in data:
            emp_email = row["email"].lower().strip()
            res = await db.execute(select(Employee).where(func.lower(Employee.email) == emp_email))
            emp = res.scalar_one_or_none()
            if not emp:
                print(f"Not found: {emp_email}")
                continue
            
            # dept
            dept_name = row["dept"].strip()
            res_dept = await db.execute(select(Department).where(Department.name == dept_name))
            dept = res_dept.scalar_one_or_none()
            if not dept:
                # create dept
                code = dept_name[:15].upper().replace(" ", "_").replace("-", "_")
                dept = Department(name=dept_name, code=code)
                db.add(dept)
                await db.flush()
                print(f"Created dept {dept_name}")
            
            mgr_name = row.get("manager_name", "").strip().lower()
            mgr_id = mgr_dict.get(mgr_name)
            if not mgr_id and mgr_name:
                print(f"Could not find manager: {mgr_name}")

            emp.employee_code = row["emp_no"]
            emp.designation = row["title"]
            emp.department_id = dept.id
            emp.location = row["location"]
            emp.legal_entity = row["legal"]
            if row["doj"]:
                emp.date_of_joining = datetime.datetime.strptime(row["doj"], "%Y-%m-%d").date()
            if mgr_id:
                emp.manager_id = mgr_id
            
            print(f"Updated {emp.email}")
            
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(update_emps())

# Training Management & Learning Analytics Platform

A production-ready, full-stack platform for managing employee training programs and tracking learning analytics.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · Shadcn UI |
| State | Zustand · React Query |
| Forms | React Hook Form · Zod |
| Charts | Recharts |
| Animation | Framer Motion |
| Backend | FastAPI · SQLAlchemy (async) · Alembic |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis · Celery |
| Auth | JWT (access + refresh tokens) |
| Infra | Docker · Nginx · GitHub Actions CI/CD |

## Project Structure

```
training-platform/
├── backend/          # FastAPI application
├── frontend/         # Vite + React application
├── nginx/            # Nginx reverse proxy config
├── .github/          # CI/CD workflows
└── docker-compose.yml
```

## Quick Start

### With Docker (recommended)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your secrets
docker-compose up --build
```

- Frontend: http://localhost
- API docs: http://localhost/docs

### Local development

**Backend**
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env                            # Edit secrets
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local                     # Edit VITE_API_BASE_URL
npm run dev
```

## Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for all required variables.

## API Endpoints

| Module | Prefix |
|---|---|
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Employees | `/api/v1/employees` |
| Departments | `/api/v1/departments` |
| Trainings | `/api/v1/trainings` |
| Enrollments | `/api/v1/enrollments` |
| Nominations | `/api/v1/nominations` |
| Effectiveness | `/api/v1/effectiveness` |
| Reports | `/api/v1/reports` |
| Notifications | `/api/v1/notifications` |
| Analytics | `/api/v1/analytics` |

## Deployment

- **Frontend** → Vercel (set `VITE_API_BASE_URL` env var)
- **Backend** → Render or Railway (set all `.env` vars)
- **Database** → Managed PostgreSQL (Supabase / Neon / Railway)
- **Redis** → Upstash or Railway

## Architecture

```
Browser → Nginx → FastAPI → PostgreSQL
                   ↓
                 Redis → Celery Worker
```

# RecruitAI

![Python](https://img.shields.io/badge/Python-3.8+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![SQLite](https://img.shields.io/badge/SQLite-3.0-lightgrey)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0+-blue)
![spaCy](https://img.shields.io/badge/spaCy-3.0+-green)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.0+-orange)

A multi-tenant Applicant Tracking System (ATS) built for speed, powered by AI for intelligent candidate evaluation and recruitment pipeline management.

## Features

- **Multi-Tenant Architecture**: Support for multiple organizations with isolated data and configurations.
- **AI-Powered Evaluation**: Automated CV parsing, scoring using TF-IDF and configurable LLM providers (OpenAI, Gemini, DeepSeek, or mock).
- **Kanban Pipeline**: Visual drag-and-drop interface for managing candidate stages with history tracking.
- **Real-Time Scoring**: Instant candidate evaluation upon application submission.
- **Email Integration**: Automated email notifications for stage changes (configurable with Resend).
- **Admin Dashboard**: Platform-wide management for super admins, including global LLM configs and tenant oversight.
- **Responsive UI**: Modern, mobile-friendly interface built with Next.js and Tailwind CSS.
- **Database Flexibility**: SQLite for development, PostgreSQL for production.
- **Docker Support**: Easy deployment with Docker Compose, compatible with Railway.

## Tech Stack

- **Frontend:** Next.js 14 App Router · TypeScript · Tailwind CSS · TanStack Query · @dnd-kit
- **Backend:** FastAPI · SQLAlchemy 2.0 async · Pydantic v2 · spaCy · scikit-learn
- **Database:** SQLite (dev) · PostgreSQL (prod)
- **AI:** Pluggable LLM provider — `mock` / `openai` / `gemini` / `deepseek`
- **Deployment:** Docker Compose · Railway-compatible

## Architecture

The project follows a microservices-like structure with a clear separation between frontend and backend:

- **Backend (FastAPI)**: Handles API endpoints, database interactions, AI processing, and business logic. Uses async SQLAlchemy for ORM, Pydantic for data validation, and spaCy/scikit-learn for NLP tasks.
- **Frontend (Next.js)**: Provides the user interface with server-side rendering, client-side routing, and real-time updates via TanStack Query.
- **Database**: Relational database with models for tenants, users, jobs, candidates, applications, and more. Migrations managed via Alembic.
- **AI Integration**: Modular LLM service supporting multiple providers for candidate scoring and evaluation.

## Repo Layout

```
recruitai/
├── frontend/          # Next.js app
├── backend/           # FastAPI app
├── db/                # SQL schema, seed_data.json, seed.py
├── docker-compose.yml # Railway-compatible
├── .env.example
└── AGENT_LOG.md       # Audit + fixes applied by agent
```

## Installation and Setup

### Prerequisites

- Python 3.8+
- Node.js 18+
- Docker (optional, for containerized deployment)

### Local Development

#### 1. Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate         # Windows  (or: source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Copy environment file from repo root
cp ../.env.example ../.env

# Run the server
uvicorn app.main:app --reload --port 8000
```

Backend boots at http://localhost:8000 — API docs at `/docs`, health check at `/health`.

#### 2. Frontend Setup

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Frontend runs at http://localhost:3000.

#### 3. Seed Data

Two ways to populate the database:

```bash
# CLI method
python db/seed.py
```

Or via the admin panel:

1. Visit http://localhost:3000/admin/login
2. Default key: `admin-secret-key`
3. Click **Seed Mock Data** on the overview page

This creates 3 tenants, 6 users, 3 jobs, 8 candidates with applications across all stages, and a global mock LLM config.

## Usage

### Login Credentials

#### Tenant Users (after seeding)

Log in at http://localhost:3000/login with email + password.

| Tenant            | Admin                    | Recruiter                    |
| ----------------- | ------------------------ | ---------------------------- |
| TechCorp Pakistan | admin@techcorp.com       | recruiter@techcorp.com       |
| Netsol            | admin@netsol.com         | recruiter@netsol.com         |
| Systems Limited   | admin@systems.com        | recruiter@systems.com        |

Password for all: `password123`

#### Platform Super Admin

The platform admin panel is separate. Access at http://localhost:3000/admin/login using the admin key.

| Field | Value                              |
| ----- | ---------------------------------- |
| URL   | http://localhost:3000/admin/login  |
| Email | _none — there is no email field_   |
| Key   | `admin-secret-key` _(dev default)_ |

Change this in production by setting `ADMIN_SECRET_KEY` in your environment (see [.env.example](./.env.example)).

### End-to-End Flow

1. Register a tenant at `/register` — or login with seeded credentials.
2. Create a job (`/jobs/new`), publish it.
3. Visit `/apply/{public_slug}` and upload a CV (PDF/DOCX).
4. Watch the candidate appear in the kanban (`/jobs/{id}/pipeline`) with TF-IDF + LLM scores.
5. Drag between stages — history is recorded; emails fire if Resend is configured.
6. Configure a real LLM provider in `/settings/llm` (per tenant) or `/admin/llm` (global).

## Deployment

### Railway (Recommended)

Railway provides managed PostgreSQL and easy Docker deployments. Deploy backend and frontend as separate services:

#### 1. Backend Service
- **Source**: Connect to your GitHub repo
- **Root Directory**: `backend/`
- **Environment Variables**:
  ```
  APP_ENV=production
  DEBUG=false
  DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/recruitai  # Railway will provide this
  ALLOWED_ORIGINS=["https://your-frontend-url.railway.app"]
  JWT_SECRET_KEY=your-32-char-secret-key
  ADMIN_SECRET_KEY=your-admin-secret-key
  SIGNED_URL_BASE=https://your-backend-url.railway.app
  SIGNED_URL_SECRET=your-signed-url-secret
  DEFAULT_LLM_PROVIDER=mock  # or openai/gemini/deepseek
  DEFAULT_LLM_MODEL=mock-model
  OPENAI_API_KEY=your-openai-key
  GEMINI_API_KEY=your-gemini-key
  DEEPSEEK_API_KEY=your-deepseek-key
  RESEND_API_KEY=your-resend-key
  LOCAL_STORAGE_PATH=/app/uploads
  ```

#### 2. Frontend Service
- **Source**: Same GitHub repo
- **Root Directory**: `frontend/`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
  ```

#### 3. Database
- Add a PostgreSQL database service in Railway
- Copy the `DATABASE_URL` to your backend service

#### 4. Domain Setup
- Set custom domains for both services
- Update `ALLOWED_ORIGINS` and `NEXT_PUBLIC_API_URL` accordingly

### Docker Compose (Local/Development)

```bash
docker compose up --build
```

Frontend at :3000, backend at :8000. Volumes (`backend_uploads`) are persistent.

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation powered by Swagger UI.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and ensure tests pass.
4. Submit a pull request.

## License

MIT

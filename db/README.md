# RecruitAI Database Configuration

## Development Setup (SQLite)

1. `cd backend`
2. `cp .env.example .env` (Make sure `DATABASE_URL=sqlite+aiosqlite:///../db/recruitai.db` is set)
3. `pip install -r requirements.txt`
4. `python -m spacy download en_core_web_sm`
5. `alembic upgrade head` (Creates tables in `db/recruitai.db`)
6. `python ../db/seed.py` (Inserts test data)
7. `uvicorn app.main:app --reload` (Runs the backend)

## Production Setup (PostgreSQL)

1. Set `DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname` in your `.env`
2. Run `alembic upgrade head` against the PostgreSQL database
3. **Important:** Do NOT run `seed.py` in production.

## Running Migrations

- **Create a new migration:** `alembic revision --autogenerate -m "description"`
- **Apply migrations:** `alembic upgrade head`
- **Revert last migration:** `alembic downgrade -1`
- **View history:** `alembic history`

## Switching from SQLite to PostgreSQL

1. Change `DATABASE_URL` in `.env`
2. Run `alembic upgrade head` against the PostgreSQL instance
3. (Optional) Migrate existing data using `pgloader` or a custom script.

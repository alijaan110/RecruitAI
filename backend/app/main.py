import time
import structlog
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import update

from app.config import settings
from app.database import init_db, is_sqlite, AsyncSessionLocal, engine
from app.routers import auth, jobs, applications, candidates, files, dashboard, billing, admin, llm
from app.models import Tenant

logger = structlog.get_logger()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Response-Time"] = f"{process_time:.4f}"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": "Validation error", "code": "422", "details": exc.errors()},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail, "code": str(exc.status_code)},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "code": "500"},
    )


for r in (auth.router, jobs.router, applications.router, candidates.router,
          files.router, dashboard.router, billing.router, admin.router, llm.router):
    app.include_router(r, prefix=settings.API_PREFIX)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "env": settings.APP_ENV,
        "db_type": "sqlite" if is_sqlite else "postgres",
    }


async def reset_monthly_cv_counts():
    try:
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Tenant)
                .where(Tenant.cv_uploads_reset_at < start_of_month)
                .values(cv_uploads_count=0, cv_uploads_reset_at=start_of_month)
            )
            await session.commit()
            logger.info("Reset monthly cv counts completed")
    except Exception as e:
        logger.error("Reset monthly cv counts failed", error=str(e))


_scheduler: AsyncIOScheduler | None = None


@app.on_event("startup")
async def startup_event():
    if is_sqlite:
        await init_db()

    try:
        import spacy  # noqa: F401
        spacy.load("en_core_web_sm")
    except Exception as e:
        logger.warning("spaCy model not loaded", error=str(e))

    logger.info(f"{settings.APP_NAME} started", env=settings.APP_ENV, db="sqlite" if is_sqlite else "postgres")

    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(reset_monthly_cv_counts, "cron", hour=0, minute=5)
    _scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
    await engine.dispose()

import os
import time
import structlog
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from slugify import slugify
import uuid

from app.database import get_db, is_sqlite
from app.config import settings
from app.models import (
    Tenant, User, Job, Candidate, Application, StageHistory, CandidateNote, EmailLog, LLMConfig
)
from app.schemas import (
    APIResponse, PaginatedResponse, AdminTenantOut, AdminUserOut, AdminStatsOut,
    AdminUpdatePlanRequest, EmailLogOut, SystemHealthOut, SeedResult,
    LLMConfigOut, LLMConfigUpsert, LLMTestRequest, LLMTestResponse,
)
from app.services.auth_service import AuthService
from app.services.llm_service import LLMService
from app.services.evaluation_service import EvaluationService
from app.services.scoring_service import ScoringService

logger = structlog.get_logger()
router = APIRouter(prefix="/admin", tags=["admin"])

_STARTED_AT = time.time()


def require_admin_key(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> str:
    if not x_admin_key or x_admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return x_admin_key


@router.get("/stats", response_model=APIResponse[AdminStatsOut])
async def stats(_=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    total_tenants = (await db.execute(select(func.count()).select_from(Tenant))).scalar() or 0
    active_tenants = (await db.execute(select(func.count()).select_from(Tenant).where(Tenant.is_active == True))).scalar() or 0
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    total_jobs = (await db.execute(select(func.count()).select_from(Job))).scalar() or 0
    total_candidates = (await db.execute(select(func.count()).select_from(Candidate))).scalar() or 0
    total_apps = (await db.execute(select(func.count()).select_from(Application))).scalar() or 0

    plan_res = await db.execute(select(Tenant.plan, func.count()).group_by(Tenant.plan))
    plan_breakdown = {p: c for p, c in plan_res.all()}

    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    seven = now - timedelta(days=7)
    thirty = now - timedelta(days=30)
    apps_7d = (await db.execute(select(func.count()).select_from(Application).where(Application.created_at >= seven))).scalar() or 0
    apps_30d = (await db.execute(select(func.count()).select_from(Application).where(Application.created_at >= thirty))).scalar() or 0

    return APIResponse(success=True, data=AdminStatsOut(
        total_tenants=total_tenants, active_tenants=active_tenants,
        total_users=total_users, total_jobs=total_jobs,
        total_candidates=total_candidates, total_applications=total_apps,
        plan_breakdown=plan_breakdown, apps_last_7d=apps_7d, apps_last_30d=apps_30d,
    ))


@router.get("/tenants", response_model=APIResponse[PaginatedResponse[AdminTenantOut]])
async def list_tenants(
    search: str | None = None, plan: str | None = None,
    page: int = 1, limit: int = 20,
    _=Depends(require_admin_key), db: AsyncSession = Depends(get_db),
):
    q = select(Tenant)
    if plan:
        q = q.where(Tenant.plan == plan)
    if search:
        q = q.where(Tenant.name.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(Tenant.created_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    tenants = list(res.scalars().all())

    items = []
    for t in tenants:
        uc = (await db.execute(select(func.count()).select_from(User).where(User.tenant_id == t.id))).scalar() or 0
        jc = (await db.execute(select(func.count()).select_from(Job).where(Job.tenant_id == t.id))).scalar() or 0
        ac = (await db.execute(select(func.count()).select_from(Application).where(Application.tenant_id == t.id))).scalar() or 0
        items.append(AdminTenantOut.model_validate({
            **t.__dict__, "user_count": uc, "job_count": jc, "application_count": ac,
        }))

    pages = max(1, (total + limit - 1) // limit)
    return APIResponse(success=True, data=PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages))


@router.get("/tenants/{tenant_id}", response_model=APIResponse[dict])
async def tenant_detail(tenant_id: str, _=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = res.scalars().first()
    if not t:
        raise HTTPException(404, "Tenant not found")
    users_res = await db.execute(select(User).where(User.tenant_id == tenant_id))
    users = list(users_res.scalars().all())
    jc = (await db.execute(select(func.count()).select_from(Job).where(Job.tenant_id == tenant_id))).scalar() or 0
    ac = (await db.execute(select(func.count()).select_from(Application).where(Application.tenant_id == tenant_id))).scalar() or 0
    return APIResponse(success=True, data={
        "tenant": AdminTenantOut.model_validate({**t.__dict__, "user_count": len(users), "job_count": jc, "application_count": ac}).model_dump(),
        "users": [AdminUserOut.model_validate({**u.__dict__, "tenant_name": t.name}).model_dump() for u in users],
    })


@router.patch("/tenants/{tenant_id}/plan", response_model=APIResponse[AdminTenantOut])
async def update_plan(tenant_id: str, req: AdminUpdatePlanRequest, _=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = res.scalars().first()
    if not t:
        raise HTTPException(404, "Tenant not found")
    if req.plan not in ("free", "pro", "enterprise"):
        raise HTTPException(400, "Invalid plan")
    t.plan = req.plan
    await db.commit()
    await db.refresh(t)
    return APIResponse(success=True, data=AdminTenantOut.model_validate({**t.__dict__, "user_count": 0, "job_count": 0, "application_count": 0}))


@router.get("/users", response_model=APIResponse[PaginatedResponse[AdminUserOut]])
async def list_users(
    search: str | None = None, role: str | None = None,
    page: int = 1, limit: int = 20,
    _=Depends(require_admin_key), db: AsyncSession = Depends(get_db),
):
    q = select(User, Tenant.name).join(Tenant, Tenant.id == User.tenant_id)
    if role:
        q = q.where(User.role == role)
    if search:
        q = q.where((User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0
    q = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(q)).all()
    items = [AdminUserOut.model_validate({**u.__dict__, "tenant_name": tname}) for (u, tname) in rows]
    pages = max(1, (total + limit - 1) // limit)
    return APIResponse(success=True, data=PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages))


@router.delete("/users/{user_id}", response_model=APIResponse[dict])
async def deactivate_user(user_id: str, _=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.id == user_id))
    u = res.scalars().first()
    if not u:
        raise HTTPException(404, "User not found")
    u.is_active = False
    await db.commit()
    return APIResponse(success=True, data={"deactivated": True})


# ---------- LLM admin ----------

@router.get("/llm-config", response_model=APIResponse[dict])
async def get_llm_config(_=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    g = (await db.execute(select(LLMConfig).where(LLMConfig.tenant_id.is_(None)))).scalars().first()
    overrides = (await db.execute(select(LLMConfig).where(LLMConfig.tenant_id.is_not(None)))).scalars().all()
    tenants_map = {t.id: t.name for t in (await db.execute(select(Tenant))).scalars().all()}

    def out(c: LLMConfig, name: str | None = None) -> dict:
        d = LLMConfigOut.model_validate(c).model_dump()
        d["api_key"] = "****" if c.api_key else None
        d["tenant_name"] = name
        return d

    return APIResponse(success=True, data={
        "global": out(g) if g else None,
        "overrides": [out(o, tenants_map.get(o.tenant_id)) for o in overrides],
    })


@router.put("/llm-config", response_model=APIResponse[LLMConfigOut])
async def upsert_global_llm(req: LLMConfigUpsert, _=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    return await _upsert_config(db, req, tenant_id=None)


@router.put("/llm-config/tenant/{tenant_id}", response_model=APIResponse[LLMConfigOut])
async def upsert_tenant_llm(tenant_id: str, req: LLMConfigUpsert, _=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    if not res.scalars().first():
        raise HTTPException(404, "Tenant not found")
    return await _upsert_config(db, req, tenant_id=tenant_id)


@router.delete("/llm-config/tenant/{tenant_id}", response_model=APIResponse[dict])
async def delete_tenant_llm(tenant_id: str, _=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(LLMConfig).where(LLMConfig.tenant_id == tenant_id))
    await db.commit()
    return APIResponse(success=True, data={"deleted": True})


@router.post("/llm-config/test", response_model=APIResponse[LLMTestResponse])
async def test_llm(req: LLMTestRequest, _=Depends(require_admin_key)):
    result = await LLMService.test_connection(req.provider, req.model_name, req.api_key or "", req.temperature, req.max_tokens)
    return APIResponse(success=True, data=LLMTestResponse(**result))


async def _upsert_config(db: AsyncSession, req: LLMConfigUpsert, tenant_id: str | None) -> APIResponse[LLMConfigOut]:
    cond = LLMConfig.tenant_id.is_(None) if tenant_id is None else (LLMConfig.tenant_id == tenant_id)
    existing = (await db.execute(select(LLMConfig).where(cond))).scalars().first()
    if existing:
        existing.provider = req.provider
        existing.model_name = req.model_name
        if req.api_key is not None and req.api_key != "" and req.api_key != "****":
            existing.api_key = req.api_key
        existing.temperature = req.temperature
        existing.max_tokens = req.max_tokens
        existing.is_active = req.is_active
        cfg = existing
    else:
        cfg = LLMConfig(
            tenant_id=tenant_id, provider=req.provider, model_name=req.model_name,
            api_key=req.api_key, temperature=req.temperature, max_tokens=req.max_tokens,
            is_active=req.is_active,
        )
        db.add(cfg)
    await db.commit()
    await db.refresh(cfg)
    out = LLMConfigOut.model_validate(cfg).model_dump()
    out["api_key"] = "****" if cfg.api_key else None
    return APIResponse(success=True, data=out)


# ---------- Email logs ----------

@router.get("/email-logs", response_model=APIResponse[PaginatedResponse[EmailLogOut]])
async def email_logs(page: int = 1, limit: int = 30, _=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(EmailLog))).scalar() or 0
    res = await db.execute(select(EmailLog).order_by(EmailLog.created_at.desc()).offset((page - 1) * limit).limit(limit))
    items = [EmailLogOut.model_validate(e) for e in res.scalars().all()]
    pages = max(1, (total + limit - 1) // limit)
    return APIResponse(success=True, data=PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages))


# ---------- System health ----------

@router.get("/system-health", response_model=APIResponse[SystemHealthOut])
async def system_health(_=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    db_ok = True
    try:
        await db.execute(select(func.count()).select_from(Tenant))
    except Exception:
        db_ok = False

    try:
        import spacy  # noqa: F401
        spacy.load("en_core_web_sm")
        spacy_ok = True
    except Exception:
        spacy_ok = False

    storage_ok = os.path.isdir(settings.LOCAL_STORAGE_PATH) or settings.STORAGE_MODE != "local"
    llm_global = (await db.execute(select(LLMConfig).where(LLMConfig.tenant_id.is_(None)))).scalars().first()

    return APIResponse(success=True, data=SystemHealthOut(
        status="ok" if db_ok else "degraded",
        db={"ok": db_ok, "type": "sqlite" if is_sqlite else "postgres"},
        llm={"provider": llm_global.provider if llm_global else settings.DEFAULT_LLM_PROVIDER, "configured": bool(llm_global)},
        spacy={"ok": spacy_ok, "model": "en_core_web_sm"},
        storage={"ok": storage_ok, "mode": settings.STORAGE_MODE, "path": settings.LOCAL_STORAGE_PATH},
        uptime_seconds=int(time.time() - _STARTED_AT),
        env=settings.APP_ENV,
    ))


# ---------- Re-evaluate applications ----------


@router.post("/applications/{application_id}/reevaluate", response_model=APIResponse[dict])
async def reevaluate_application(application_id: str, _=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    """Force a re-run of the multi-agent evaluation for one application."""
    res = await db.execute(
        select(Application)
        .where(Application.id == application_id)
        .options(selectinload(Application.candidate), selectinload(Application.job))
    )
    app = res.scalars().first()
    if not app:
        raise HTTPException(404, "Application not found")
    if not app.candidate or not app.job:
        raise HTTPException(400, "Application missing candidate or job")

    cv_text = app.candidate.raw_cv_text or " ".join(app.candidate.parsed_data.get("skills", []) or [])
    parsed = app.candidate.parsed_data or {}
    tfidf = ScoringService.compute_score(
        cv_text=cv_text,
        parsed_data=parsed,
        job_keywords=app.job.keywords or [],
        job_requirements=app.job.requirements or [],
        job_description=app.job.description or "",
    )
    evaluation = await EvaluationService.evaluate(
        cv_text=cv_text, parsed_data=parsed,
        job={
            "title": app.job.title, "description": app.job.description,
            "keywords": app.job.keywords, "requirements": app.job.requirements,
            "nice_to_have": app.job.nice_to_have,
        },
        tenant_id=app.tenant_id, db=db,
        tfidf_score=float(tfidf.get("keyword_score") or 0.0),
    )
    app.keyword_score = tfidf["keyword_score"]
    app.overall_score = evaluation["overall_score"]
    app.score_breakdown = {**tfidf, "evaluation": evaluation}
    await db.commit()
    return APIResponse(success=True, data={
        "application_id": application_id,
        "overall_score": evaluation["overall_score"],
        "recommendation": evaluation["recommendation"],
        "fell_back_to_mock": evaluation["meta"]["fell_back_to_mock"],
        "any_agent_failed": evaluation["meta"]["any_agent_failed"],
    })


@router.post("/applications/reevaluate-all", response_model=APIResponse[dict])
async def reevaluate_all(
    tenant_id: str | None = Query(default=None),
    job_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    _=Depends(require_admin_key),
    db: AsyncSession = Depends(get_db),
):
    """Re-run evaluation across many applications (filtered)."""
    q = select(Application).options(
        selectinload(Application.candidate), selectinload(Application.job)
    ).order_by(Application.created_at.desc()).limit(limit)
    if tenant_id:
        q = q.where(Application.tenant_id == tenant_id)
    if job_id:
        q = q.where(Application.job_id == job_id)

    apps = (await db.execute(q)).scalars().all()
    processed = 0
    used_mock = 0
    failures = 0

    for app in apps:
        if not app.candidate or not app.job:
            continue
        cv_text = app.candidate.raw_cv_text or " ".join(app.candidate.parsed_data.get("skills", []) or [])
        parsed = app.candidate.parsed_data or {}
        tfidf = ScoringService.compute_score(
            cv_text=cv_text, parsed_data=parsed,
            job_keywords=app.job.keywords or [],
            job_requirements=app.job.requirements or [],
            job_description=app.job.description or "",
        )
        try:
            ev = await EvaluationService.evaluate(
                cv_text=cv_text, parsed_data=parsed,
                job={
                    "title": app.job.title, "description": app.job.description,
                    "keywords": app.job.keywords, "requirements": app.job.requirements,
                    "nice_to_have": app.job.nice_to_have,
                },
                tenant_id=app.tenant_id, db=db,
                tfidf_score=float(tfidf.get("keyword_score") or 0.0),
            )
            app.keyword_score = tfidf["keyword_score"]
            app.overall_score = ev["overall_score"]
            app.score_breakdown = {**tfidf, "evaluation": ev}
            if ev["meta"]["fell_back_to_mock"]:
                used_mock += 1
            processed += 1
        except Exception as e:
            failures += 1
            logger.error("re-evaluation failed", app_id=app.id, error=str(e))

    await db.commit()
    return APIResponse(success=True, data={
        "scanned": len(apps),
        "processed": processed,
        "fell_back_to_mock_for": used_mock,
        "failures": failures,
    })


# ---------- Seed mock data ----------

SEED_DATA = {
    "tenants": [
        {"name": "TechCorp Pakistan", "slug": "techcorp-pakistan", "plan": "free"},
        {"name": "Netsol Technologies", "slug": "netsol-technologies", "plan": "pro"},
        {"name": "Systems Limited", "slug": "systems-limited", "plan": "enterprise"},
    ],
    "users_per_tenant": [
        {"role": "admin", "full_name_prefix": "Admin"},
        {"role": "recruiter", "full_name_prefix": "Recruiter"},
    ],
    "jobs": [
        {
            "tenant": "techcorp-pakistan", "title": "Senior Frontend Engineer",
            "department": "Engineering", "location": "Lahore, PK", "employment_type": "full_time",
            "description": "We are hiring a senior frontend engineer to ship our customer-facing platform. "
                           "You will own architecture, performance, and UX quality across React/Next.js apps.",
            "requirements": ["3+ years React", "TypeScript", "Next.js"],
            "keywords": ["React", "TypeScript", "Next.js", "JavaScript", "CSS", "HTML", "Tailwind"],
            "status": "published",
        },
        {
            "tenant": "techcorp-pakistan", "title": "Backend Python Developer",
            "department": "Engineering", "location": "Karachi, PK", "employment_type": "full_time",
            "description": "Build and operate the backend services powering RecruitAI. Python first, async heavy.",
            "requirements": ["Python 3.11", "FastAPI or Django", "PostgreSQL"],
            "keywords": ["Python", "FastAPI", "Django", "PostgreSQL", "REST", "Docker", "SQL"],
            "status": "published",
        },
        {
            "tenant": "techcorp-pakistan", "title": "Product Manager",
            "department": "Product", "location": "Remote", "employment_type": "full_time",
            "description": "Own the product roadmap. Talk to recruiters, scope features, and ship outcomes.",
            "requirements": ["3+ years PM experience", "Agile", "Scrum"],
            "keywords": ["Product Management", "Agile", "Scrum", "Jira"],
            "status": "draft",
        },
    ],
    "applicants": [
        # Frontend
        {"job_title": "Senior Frontend Engineer", "candidates": [
            {"full_name": "Ahmed Khan", "email": "ahmed.khan@example.com", "stage": "interview", "score": 85, "skills": ["React", "TypeScript", "Next.js", "CSS"]},
            {"full_name": "Sara Ahmed", "email": "sara.ahmed@example.com", "stage": "screening", "score": 68, "skills": ["React", "JavaScript", "CSS"]},
            {"full_name": "Ali Raza", "email": "ali.raza@example.com", "stage": "rejected", "score": 42, "skills": ["Angular", "JavaScript"]},
            {"full_name": "Fatima Malik", "email": "fatima.malik@example.com", "stage": "offer", "score": 92, "skills": ["React", "TypeScript", "Next.js", "GraphQL"]},
        ]},
        # Backend
        {"job_title": "Backend Python Developer", "candidates": [
            {"full_name": "Bilal Hassan", "email": "bilal.hassan@example.com", "stage": "interview", "score": 88, "skills": ["Python", "FastAPI", "PostgreSQL"]},
            {"full_name": "Aisha Siddiq", "email": "aisha.siddiq@example.com", "stage": "screening", "score": 72, "skills": ["Python", "Django", "MySQL"]},
            {"full_name": "Omar Sheikh", "email": "omar.sheikh@example.com", "stage": "rejected", "score": 38, "skills": ["Node.js", "Express", "MongoDB"]},
            {"full_name": "Zara Qureshi", "email": "zara.qureshi@example.com", "stage": "received", "score": 84, "skills": ["Python", "Flask", "PostgreSQL", "Docker"]},
        ]},
    ],
}


@router.post("/seed-mock-data", response_model=APIResponse[SeedResult])
async def seed_mock_data(_=Depends(require_admin_key), db: AsyncSession = Depends(get_db)):
    seeded_tenants = 0
    seeded_users = 0
    seeded_jobs = 0
    seeded_candidates = 0
    seeded_apps = 0

    tenant_map: dict[str, Tenant] = {}
    for t_data in SEED_DATA["tenants"]:
        existing = (await db.execute(select(Tenant).where(Tenant.slug == t_data["slug"]))).scalars().first()
        if existing:
            tenant_map[t_data["slug"]] = existing
            continue
        t = Tenant(name=t_data["name"], slug=t_data["slug"], plan=t_data["plan"])
        db.add(t)
        await db.flush()
        tenant_map[t_data["slug"]] = t
        seeded_tenants += 1

        # Users per tenant
        domain = t_data["slug"].split("-")[0]
        for u in SEED_DATA["users_per_tenant"]:
            email = f"{u['role']}@{domain}.com"
            existing_u = (await db.execute(select(User).where(User.email == email))).scalars().first()
            if existing_u:
                continue
            user = User(
                tenant_id=t.id,
                full_name=f"{u['full_name_prefix']} {t.name}",
                email=email,
                hashed_password=AuthService.get_password_hash("password123"),
                role=u["role"],
                is_active=True,
            )
            db.add(user)
            seeded_users += 1
    await db.flush()

    # Jobs (only for techcorp-pakistan per spec)
    job_map: dict[str, Job] = {}
    for j in SEED_DATA["jobs"]:
        tenant = tenant_map.get(j["tenant"])
        if not tenant:
            continue
        existing_j = (await db.execute(select(Job).where(Job.tenant_id == tenant.id, Job.title == j["title"]))).scalars().first()
        if existing_j:
            job_map[j["title"]] = existing_j
            continue
        admin_email = f"admin@{tenant.slug.split('-')[0]}.com"
        admin_user = (await db.execute(select(User).where(User.email == admin_email))).scalars().first()
        if not admin_user:
            continue
        slug = f"{slugify(j['title'])}-{str(uuid.uuid4())[:6]}"
        job = Job(
            tenant_id=tenant.id, created_by=admin_user.id,
            title=j["title"], department=j["department"], location=j["location"],
            employment_type=j["employment_type"], description=j["description"],
            requirements=j["requirements"], nice_to_have=[], keywords=j["keywords"],
            status=j["status"], public_slug=slug,
            published_at=datetime.utcnow().replace(tzinfo=timezone.utc) if j["status"] == "published" else None,
        )
        db.add(job)
        await db.flush()
        job_map[j["title"]] = job
        seeded_jobs += 1

    # Candidates + Applications
    for group in SEED_DATA["applicants"]:
        job = job_map.get(group["job_title"])
        if not job:
            continue
        admin_user = (await db.execute(select(User).where(User.tenant_id == job.tenant_id, User.role == "admin"))).scalars().first()
        for c_data in group["candidates"]:
            existing_c = (await db.execute(select(Candidate).where(
                Candidate.tenant_id == job.tenant_id, Candidate.email == c_data["email"]
            ))).scalars().first()
            if existing_c:
                candidate = existing_c
            else:
                candidate = Candidate(
                    tenant_id=job.tenant_id,
                    full_name=c_data["full_name"], email=c_data["email"],
                    parsed_data={
                        "skills": c_data["skills"],
                        "total_experience_months": 36,
                        "experience": [], "education": [], "languages": [], "summary": "",
                    },
                )
                db.add(candidate)
                await db.flush()
                seeded_candidates += 1

            existing_app = (await db.execute(select(Application).where(
                Application.job_id == job.id, Application.candidate_id == candidate.id
            ))).scalars().first()
            if existing_app:
                continue

            score = float(c_data["score"])
            mock_llm = await LLMService.score_cv(
                cv_text=" ".join(c_data["skills"]),
                parsed_data={"skills": c_data["skills"], "total_experience_months": 36},
                job={"title": job.title, "description": job.description, "keywords": job.keywords, "requirements": job.requirements},
                tenant_id=job.tenant_id, db=db,
            )
            app = Application(
                tenant_id=job.tenant_id, job_id=job.id, candidate_id=candidate.id,
                stage=c_data["stage"],
                keyword_score=round(score * 0.9, 2),
                overall_score=score,
                score_breakdown={
                    "keyword_score": round(score * 0.9, 2),
                    "skills_match": round(score * 0.95, 2),
                    "experience_score": 70.0,
                    "overall_score": score,
                    "matched_keywords": c_data["skills"],
                    "missing_keywords": [k for k in job.keywords if k not in c_data["skills"]],
                    "llm_analysis": mock_llm,
                },
            )
            db.add(app)
            await db.flush()
            seeded_apps += 1

            # Stage history walk
            ladder = ["received", "screening", "interview", "offer", "hired"]
            target = c_data["stage"]
            if target == "rejected":
                walk = ["received", "screening", "rejected"]
            elif target in ladder:
                walk = ladder[: ladder.index(target) + 1]
            else:
                walk = ["received"]
            prev = walk[0]
            for s in walk[1:]:
                db.add(StageHistory(
                    application_id=app.id, tenant_id=job.tenant_id,
                    from_stage=prev, to_stage=s,
                    changed_by=admin_user.id if admin_user else None,
                    changed_by_name=admin_user.full_name if admin_user else None,
                    note=f"Moved to {s}",
                ))
                prev = s

            if c_data["stage"] in ("interview", "offer") and admin_user:
                db.add(CandidateNote(
                    application_id=app.id, tenant_id=job.tenant_id,
                    author_id=admin_user.id, author_name=admin_user.full_name,
                    note_type="interview", content="Strong technical background. Recommend moving forward.", is_private=False,
                ))
                db.add(CandidateNote(
                    application_id=app.id, tenant_id=job.tenant_id,
                    author_id=admin_user.id, author_name=admin_user.full_name,
                    note_type="general", content="Available within 2 weeks. Visa not required.", is_private=False,
                ))

    # Global LLM config
    existing_llm = (await db.execute(select(LLMConfig).where(LLMConfig.tenant_id.is_(None)))).scalars().first()
    if not existing_llm:
        db.add(LLMConfig(
            tenant_id=None, provider="mock", model_name="mock-model",
            api_key=None, temperature=0.7, max_tokens=1000, is_active=True,
        ))

    await db.commit()
    return APIResponse(success=True, data=SeedResult(
        seeded=True, tenants=seeded_tenants, users=seeded_users, jobs=seeded_jobs,
        candidates=seeded_candidates, applications=seeded_apps,
        note="Idempotent seed: existing rows were left in place.",
    ))

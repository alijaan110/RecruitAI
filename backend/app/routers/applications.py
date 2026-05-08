from datetime import datetime, timezone
import uuid
import structlog
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Form, UploadFile, File
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db, AsyncSessionLocal
from app.dependencies import get_current_user, require_recruiter, CurrentUser
from app.models import Job, Application, Candidate, Tenant, StageHistory, CandidateNote
from app.schemas import (
    APIResponse, PaginatedResponse, ApplicationOut, ApplicationDetailOut,
    ApplicationStageUpdate, ApplicationStarUpdate, ApplicationDisqualify,
)
from app.services.cv_parser import CVParser
from app.services.scoring_service import ScoringService
from app.services.storage_service import StorageService
from app.services.email_service import EmailService
from app.services.evaluation_service import EvaluationService

logger = structlog.get_logger()
router = APIRouter(prefix="/applications", tags=["applications"])


def _detect_mime(filename: str, declared: str | None) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return declared or ""


async def process_cv_background(app_id: str, file_bytes: bytes, mime_type: str, job_id: str, tenant_id: str):
    async with AsyncSessionLocal() as db:
        try:
            app_res = await db.execute(
                select(Application).where(Application.id == app_id).options(selectinload(Application.candidate))
            )
            application = app_res.scalars().first()
            if not application:
                return

            job = (await db.execute(select(Job).where(Job.id == job_id))).scalars().first()
            tenant = (await db.execute(select(Tenant).where(Tenant.id == tenant_id))).scalars().first()
            if not job or not tenant:
                return

            raw_text, parsed_data = await CVParser.parse_cv(file_bytes, mime_type)

            tfidf = ScoringService.compute_score(
                cv_text=raw_text or "",
                parsed_data=parsed_data,
                job_keywords=job.keywords or [],
                job_requirements=job.requirements or [],
                job_description=job.description or "",
            )

            evaluation = await EvaluationService.evaluate(
                cv_text=raw_text or "",
                parsed_data=parsed_data,
                job={
                    "title": job.title, "description": job.description,
                    "keywords": job.keywords, "requirements": job.requirements,
                    "nice_to_have": job.nice_to_have,
                },
                tenant_id=tenant_id, db=db,
                tfidf_score=float(tfidf.get("keyword_score") or 0.0),
            )

            application.candidate.raw_cv_text = raw_text
            application.candidate.parsed_data = parsed_data
            application.keyword_score = tfidf["keyword_score"]
            application.overall_score = evaluation["overall_score"]
            application.score_breakdown = {**tfidf, "evaluation": evaluation}

            tenant.cv_uploads_count = (tenant.cv_uploads_count or 0) + 1

            await db.commit()

            try:
                html = EmailService.application_received(
                    application.candidate.full_name, job.title, tenant.name
                )
                await EmailService.send_email(
                    to_email=application.candidate.email, to_name=application.candidate.full_name,
                    subject=f"Application Received: {job.title}", html=html,
                    template_name="app_received", tenant_id=tenant.id, db=db,
                )
            except Exception as e:
                logger.warning("Application receipt email failed", error=str(e))

        except Exception as e:
            logger.error("process_cv_background failed", error=str(e))
            await db.rollback()


@router.post("/public")
async def submit_public_application(
    background_tasks: BackgroundTasks,
    job_id: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str | None = Form(None),
    linkedin_url: str | None = Form(None),
    portfolio_url: str | None = Form(None),
    cover_letter: str | None = Form(None),
    cv_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        if not cv_file.filename or not cv_file.filename.lower().endswith((".pdf", ".docx")):
            raise HTTPException(400, "Only PDF or DOCX allowed")

        file_bytes = await cv_file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(413, "File too large. Max 10MB.")

        # Job by id OR by public_slug
        job_q = select(Job).where(or_(Job.id == job_id, Job.public_slug == job_id))
        job = (await db.execute(job_q)).scalars().first()
        if not job:
            raise HTTPException(404, "Job not found")

        if job.status != "published":
            raise HTTPException(404, "Job is not published")

        if job.closes_at and job.closes_at < datetime.utcnow().replace(tzinfo=timezone.utc):
            raise HTTPException(404, "Job is closed")

        tenant = (await db.execute(select(Tenant).where(Tenant.id == job.tenant_id))).scalars().first()
        if not tenant:
            raise HTTPException(404, "Company not found")

        if tenant.plan == "free" and (tenant.cv_uploads_count or 0) >= settings.FREE_MAX_CV_UPLOADS:
            raise HTTPException(402, "Application limit reached for this company")

        candidate = (await db.execute(
            select(Candidate).where(Candidate.tenant_id == tenant.id, Candidate.email == email)
        )).scalars().first()

        if not candidate:
            candidate = Candidate(
                tenant_id=tenant.id, full_name=full_name, email=email,
                phone=phone, linkedin_url=linkedin_url, portfolio_url=portfolio_url, source="direct",
            )
            db.add(candidate)
            await db.flush()
        else:
            candidate.full_name = full_name
            candidate.phone = phone or candidate.phone
            candidate.linkedin_url = linkedin_url or candidate.linkedin_url
            candidate.portfolio_url = portfolio_url or candidate.portfolio_url

        existing = (await db.execute(
            select(Application).where(Application.job_id == job.id, Application.candidate_id == candidate.id)
        )).scalars().first()
        if existing:
            raise HTTPException(409, "You have already applied to this job")

        c_uuid = str(uuid.uuid4())
        file_path = await StorageService.upload(file_bytes, cv_file.filename, tenant.id, candidate.id, c_uuid)
        candidate.cv_file_path = file_path
        candidate.cv_file_name = cv_file.filename

        application = Application(
            tenant_id=tenant.id, job_id=job.id, candidate_id=candidate.id,
            stage="received", cover_letter=cover_letter,
        )
        db.add(application)
        await db.commit()
        await db.refresh(application)

        mime_type = _detect_mime(cv_file.filename, cv_file.content_type)
        background_tasks.add_task(process_cv_background, application.id, file_bytes, mime_type, job.id, tenant.id)

        return {"application_id": application.id, "message": "Application submitted"}
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error("submit_public_application failed", error=str(e))
        raise HTTPException(400, str(e))


@router.get("", response_model=APIResponse[PaginatedResponse[ApplicationOut]])
async def list_applications(
    job_id: str | None = None,
    stage: str | None = None,
    min_score: float | None = None,
    max_score: float | None = None,
    is_starred: bool | None = None,
    search: str | None = None,
    sort: str = "date",
    page: int = 1,
    limit: int = 20,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Application).where(Application.tenant_id == user.tenant_id)

    if job_id:
        query = query.where(Application.job_id == job_id)
    if stage:
        query = query.where(Application.stage == stage)
    if min_score is not None:
        query = query.where(Application.overall_score >= min_score)
    if max_score is not None:
        query = query.where(Application.overall_score <= max_score)
    if is_starred is not None:
        query = query.where(Application.is_starred == is_starred)

    query = query.join(Candidate, Candidate.id == Application.candidate_id)
    if search:
        query = query.where(or_(Candidate.full_name.ilike(f"%{search}%"), Candidate.email.ilike(f"%{search}%")))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0

    if sort == "score":
        query = query.order_by(Application.overall_score.desc().nullslast(), Application.applied_at.desc())
    elif sort == "name":
        query = query.order_by(Candidate.full_name.asc())
    else:
        query = query.order_by(Application.applied_at.desc())

    query = query.offset((page - 1) * limit).limit(limit).options(
        selectinload(Application.candidate), selectinload(Application.job)
    )

    apps = (await db.execute(query)).scalars().all()
    pages = max(1, (total + limit - 1) // limit)

    return APIResponse(success=True, data=PaginatedResponse(
        items=[ApplicationOut.model_validate(a) for a in apps],
        total=total, page=page, limit=limit, pages=pages,
    ))


@router.get("/pipeline/{job_id}", response_model=APIResponse[dict])
async def get_pipeline(job_id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Application)
        .where(Application.job_id == job_id, Application.tenant_id == user.tenant_id)
        .options(selectinload(Application.candidate), selectinload(Application.job))
        .order_by(Application.overall_score.desc().nullslast(), Application.applied_at.desc())
    )
    apps = res.scalars().all()
    pipeline: dict[str, list] = {
        "received": [], "screening": [], "interview": [],
        "offer": [], "hired": [], "rejected": [],
    }
    for app in apps:
        if app.stage in pipeline:
            pipeline[app.stage].append(ApplicationOut.model_validate(app).model_dump())
    return APIResponse(success=True, data=pipeline)


@router.get("/{id}", response_model=APIResponse[ApplicationDetailOut])
async def get_application(id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Application)
        .where(Application.id == id, Application.tenant_id == user.tenant_id)
        .options(selectinload(Application.candidate), selectinload(Application.job))
    )
    app = res.scalars().first()
    if not app:
        raise HTTPException(404, "Application not found")

    history = (await db.execute(
        select(StageHistory).where(StageHistory.application_id == id).order_by(StageHistory.created_at.desc()).limit(20)
    )).scalars().all()
    notes = (await db.execute(
        select(CandidateNote).where(CandidateNote.application_id == id).order_by(CandidateNote.created_at.desc())
    )).scalars().all()
    notes = [n for n in notes if not n.is_private or n.author_id == user.id]

    cv_url = None
    if app.candidate.cv_file_path:
        cv_url = await StorageService.get_signed_url(app.candidate.cv_file_path)

    payload = ApplicationOut.model_validate(app).model_dump()
    payload["stage_history"] = [
        {"id": h.id, "from_stage": h.from_stage, "to_stage": h.to_stage,
         "changed_by": h.changed_by, "changed_by_name": h.changed_by_name,
         "note": h.note, "created_at": h.created_at.isoformat()}
        for h in history
    ]
    payload["notes"] = [
        {"id": n.id, "author_id": n.author_id, "author_name": n.author_name,
         "note_type": n.note_type, "content": n.content, "is_private": n.is_private,
         "created_at": n.created_at.isoformat(), "updated_at": n.updated_at.isoformat()}
        for n in notes
    ]
    payload["cv_url"] = cv_url
    return APIResponse(success=True, data=payload)


@router.patch("/{id}/stage", response_model=APIResponse[ApplicationOut])
async def update_stage(
    id: str, req: ApplicationStageUpdate, bg_tasks: BackgroundTasks,
    user: CurrentUser = Depends(require_recruiter), db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Application)
        .where(Application.id == id, Application.tenant_id == user.tenant_id)
        .options(selectinload(Application.candidate), selectinload(Application.job))
    )
    app = res.scalars().first()
    if not app:
        raise HTTPException(404, "Application not found")

    if req.stage not in ("received", "screening", "interview", "offer", "hired", "rejected"):
        raise HTTPException(400, "Invalid stage")

    old_stage = app.stage
    app.stage = req.stage
    app.last_stage_at = datetime.utcnow().replace(tzinfo=timezone.utc)

    db.add(StageHistory(
        application_id=app.id, tenant_id=user.tenant_id,
        from_stage=old_stage, to_stage=req.stage,
        changed_by=user.id, changed_by_name=user.full_name, note=req.note,
    ))
    await db.commit()
    await db.refresh(app)

    if req.stage in ("interview", "offer"):
        try:
            html = EmailService.stage_moved(app.candidate.full_name, app.job.title, req.stage, user.tenant.name)
            bg_tasks.add_task(
                EmailService.send_email,
                app.candidate.email, app.candidate.full_name, "Update on your application",
                html, "stage_moved", user.tenant_id,
            )
        except Exception as e:
            logger.warning("stage_moved email failed", error=str(e))

    return APIResponse(success=True, data=ApplicationOut.model_validate(app))


@router.patch("/{id}/star", response_model=APIResponse[dict])
async def toggle_star(id: str, req: ApplicationStarUpdate, user: CurrentUser = Depends(require_recruiter), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Application).where(Application.id == id, Application.tenant_id == user.tenant_id))
    app = res.scalars().first()
    if not app:
        raise HTTPException(404, "Application not found")
    app.is_starred = req.is_starred
    await db.commit()
    return APIResponse(success=True, data={"is_starred": app.is_starred})


@router.post("/{id}/reevaluate", response_model=APIResponse[dict])
async def reevaluate(id: str, user: CurrentUser = Depends(require_recruiter), db: AsyncSession = Depends(get_db)):
    """Re-run the multi-agent evaluation for one application (tenant-scoped)."""
    res = await db.execute(
        select(Application)
        .where(Application.id == id, Application.tenant_id == user.tenant_id)
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
        cv_text=cv_text, parsed_data=parsed,
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
        "overall_score": evaluation["overall_score"],
        "recommendation": evaluation["recommendation"],
        "fell_back_to_mock": evaluation["meta"]["fell_back_to_mock"],
        "any_agent_failed": evaluation["meta"]["any_agent_failed"],
    })


@router.patch("/{id}/disqualify", response_model=APIResponse[ApplicationOut])
async def disqualify(id: str, req: ApplicationDisqualify, user: CurrentUser = Depends(require_recruiter), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Application).where(Application.id == id, Application.tenant_id == user.tenant_id)
        .options(selectinload(Application.candidate), selectinload(Application.job))
    )
    app = res.scalars().first()
    if not app:
        raise HTTPException(404, "Application not found")
    old_stage = app.stage
    app.is_disqualified = True
    app.disqualify_reason = req.reason
    app.stage = "rejected"
    app.last_stage_at = datetime.utcnow().replace(tzinfo=timezone.utc)
    db.add(StageHistory(
        application_id=app.id, tenant_id=user.tenant_id,
        from_stage=old_stage, to_stage="rejected",
        changed_by=user.id, changed_by_name=user.full_name,
        note=f"Disqualified: {req.reason}",
    ))
    await db.commit()
    await db.refresh(app)
    return APIResponse(success=True, data=ApplicationOut.model_validate(app))

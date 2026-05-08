from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from app.database import get_db
from app.schemas import JobCreate, JobUpdate, JobOut, PublicJobOut, PublicCompanyBoardOut, APIResponse, PaginatedResponse
from app.dependencies import get_current_user, require_recruiter, require_admin, check_job_limit, CurrentUser
from app.models import Job, Application
from slugify import slugify
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("", response_model=APIResponse[PaginatedResponse[JobOut]])
async def list_jobs(
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 20,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Job).where(Job.tenant_id == user.tenant_id)
    
    if status:
        query = query.where(Job.status == status)
    if search:
        query = query.where(Job.title.ilike(f"%{search}%"))
        
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    # Pagination
    query = query.order_by(Job.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    jobs = list(result.scalars().all())
    
    # Fetch counts manually for MVP
    items = []
    for j in jobs:
        c_res = await db.execute(select(func.count(Application.id)).where(Application.job_id == j.id))
        app_count = c_res.scalar_one()
        job_dict = {**j.__dict__, "total_applications": app_count, "apps_by_stage": {}}
        items.append(JobOut.model_validate(job_dict))

    pages = max(1, (total + limit - 1) // limit)
    return APIResponse(success=True, data=PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages))

@router.post("", response_model=APIResponse[JobOut], dependencies=[Depends(require_recruiter), Depends(check_job_limit)])
async def create_job(req: JobCreate, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        slug = f"{slugify(req.title)}-{str(uuid.uuid4())[:6]}"
        job = Job(
            tenant_id=user.tenant_id,
            created_by=user.id,
            status="draft",
            public_slug=slug,
            **req.model_dump()
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return APIResponse(success=True, data=JobOut.model_validate({**job.__dict__, "total_applications": 0, "apps_by_stage": {}}))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}", response_model=APIResponse[JobOut])
async def get_job(id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == id, Job.tenant_id == user.tenant_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    c_res = await db.execute(select(func.count(Application.id)).where(Application.job_id == job.id))
    app_count = c_res.scalar_one()
    
    stage_res = await db.execute(select(Application.stage, func.count(Application.id)).where(Application.job_id == job.id).group_by(Application.stage))
    apps_by_stage = {s: c for s, c in stage_res.all()}
    
    return APIResponse(success=True, data=JobOut.model_validate({**job.__dict__, "total_applications": app_count, "apps_by_stage": apps_by_stage}))

@router.put("/{id}", response_model=APIResponse[JobOut])
async def update_job(id: str, req: JobUpdate, user: CurrentUser = Depends(require_recruiter), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == id, Job.tenant_id == user.tenant_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(job, k, v)
        
    await db.commit()
    await db.refresh(job)
    return APIResponse(success=True, data=JobOut.model_validate({**job.__dict__, "total_applications": 0, "apps_by_stage": {}}))

@router.delete("/{id}")
async def delete_job(id: str, user: CurrentUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == id, Job.tenant_id == user.tenant_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job.status = "archived"
    await db.commit()
    return APIResponse(success=True, data={"archived": True})

@router.post("/{id}/publish", response_model=APIResponse[JobOut])
async def publish_job(id: str, user: CurrentUser = Depends(require_recruiter), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == id, Job.tenant_id == user.tenant_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if not job.title or len(job.description) < 20 or not job.requirements:
        raise HTTPException(status_code=400, detail="Job needs a title, description > 20 chars, and at least 1 requirement to publish")
        
    job.status = "published"
    job.published_at = datetime.utcnow().replace(tzinfo=timezone.utc)
    await db.commit()
    await db.refresh(job)
    return APIResponse(success=True, data=JobOut.model_validate({**job.__dict__, "total_applications": 0, "apps_by_stage": {}}))

@router.post("/{id}/close", response_model=APIResponse[JobOut])
async def close_job(id: str, user: CurrentUser = Depends(require_recruiter), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == id, Job.tenant_id == user.tenant_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job.status = "closed"
    job.closes_at = datetime.utcnow().replace(tzinfo=timezone.utc)
    await db.commit()
    await db.refresh(job)
    return APIResponse(success=True, data=JobOut.model_validate({**job.__dict__, "total_applications": 0, "apps_by_stage": {}}))

@router.get("/company/{slug}", response_model=APIResponse[PublicCompanyBoardOut])
async def get_public_company_board(slug: str, db: AsyncSession = Depends(get_db)):
    from app.models import Tenant
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Company not found")
        
    jobs_result = await db.execute(
        select(Job).where(
            Job.tenant_id == tenant.id,
            Job.status == "published"
        ).order_by(Job.published_at.desc())
    )
    jobs = list(jobs_result.scalars().all())
    
    # filter out closed jobs
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    active_jobs = [j for j in jobs if not (j.closes_at and j.closes_at < now)]

    tenant_info = {
        "name": tenant.name,
        "slug": tenant.slug,
        "logo_url": tenant.logo_url
    }

    return APIResponse(success=True, data=PublicCompanyBoardOut(tenant=tenant_info, jobs=[PublicJobOut.model_validate(j) for j in active_jobs]))

@router.get("/public/{slug}", response_model=APIResponse[PublicJobOut])
async def get_public_job(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job).where(
            Job.public_slug == slug,
            Job.status == "published"
        )
    )
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not open")
        
    if job.closes_at and job.closes_at < datetime.utcnow().replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=404, detail="Job application is closed")
        
    return APIResponse(success=True, data=PublicJobOut.model_validate(job))

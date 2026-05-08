from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.schemas import APIResponse
from app.models import Job, Application, Candidate

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=APIResponse[dict])
async def get_dashboard_stats(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)
    
    tenant_id = user.tenant_id
    
    # Active jobs
    active_jobs = (await db.execute(select(func.count()).where(Job.tenant_id == tenant_id, Job.status == "published"))).scalar()
    
    # Total apps 30d
    total_apps_30d = (await db.execute(select(func.count()).where(Application.tenant_id == tenant_id, Application.created_at >= thirty_days_ago))).scalar()
    
    # New apps today
    new_apps_today = (await db.execute(select(func.count()).where(Application.tenant_id == tenant_id, Application.created_at >= today))).scalar()
    
    # In interview
    in_interview = (await db.execute(select(func.count()).where(Application.tenant_id == tenant_id, Application.stage == "interview"))).scalar()
    
    # Offers made
    offers_made = (await db.execute(select(func.count()).where(Application.tenant_id == tenant_id, Application.stage.in_(["offer", "hired"])))).scalar()
    
    # Avg score
    avg_score = (await db.execute(select(func.avg(Application.overall_score)).where(Application.tenant_id == tenant_id, Application.overall_score.isnot(None)))).scalar() or 0
    
    # Apps by stage
    stage_res = await db.execute(select(Application.stage, func.count()).where(Application.tenant_id == tenant_id).group_by(Application.stage))
    apps_by_stage = {s: c for s, c in stage_res.all()}
    
    # Top 5 jobs
    top_jobs_res = await db.execute(
        select(Job.id, Job.title, func.count(Application.id).label("apps_count"), func.avg(Application.overall_score).label("avg_score"))
        .outerjoin(Application, Job.id == Application.job_id)
        .where(Job.tenant_id == tenant_id)
        .group_by(Job.id)
        .order_by(text("apps_count DESC"))
        .limit(5)
    )
    top_jobs = [{"id": r[0], "title": r[1], "applications": r[2], "avg_score": r[3] or 0} for r in top_jobs_res.all()]
    
    # Recent applications
    recent_apps_res = await db.execute(
        select(Application)
        .where(Application.tenant_id == tenant_id)
        .options(selectinload(Application.candidate), selectinload(Application.job))
        .order_by(Application.created_at.desc())
        .limit(5)
    )
    recent_apps = []
    for app in recent_apps_res.scalars().all():
        recent_apps.append({
            "id": app.id,
            "candidate_name": app.candidate.full_name,
            "job_title": app.job.title,
            "stage": app.stage,
            "date": app.created_at.isoformat()
        })
        
    return APIResponse(success=True, data={
        "active_jobs": active_jobs,
        "total_apps_30d": total_apps_30d,
        "new_apps_today": new_apps_today,
        "in_interview": in_interview,
        "offers_made": offers_made,
        "avg_score": round(avg_score, 1),
        "apps_by_stage": apps_by_stage,
        "top_jobs": top_jobs,
        "recent_apps": recent_apps
    })

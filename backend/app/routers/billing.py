from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.dependencies import get_current_user, require_admin, CurrentUser
from app.models import Tenant, Job
from app.config import settings
from app.schemas import APIResponse, PlanUsageOut, CheckoutRequest
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/billing", tags=["billing"])

@router.get("/plan", response_model=APIResponse[PlanUsageOut])
async def get_plan(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tenant_id = user.tenant_id
    active_jobs = (await db.execute(select(func.count()).where(Job.tenant_id == tenant_id, Job.status == "published"))).scalar()
    
    await db.refresh(user.tenant)
    max_jobs = settings.FREE_MAX_JOBS if user.tenant.plan == "free" else 9999
    max_cv = settings.FREE_MAX_CV_UPLOADS if user.tenant.plan == "free" else settings.PRO_MAX_CV_UPLOADS
    
    data = {
        "plan": user.tenant.plan,
        "active_jobs": {"used": active_jobs, "limit": max_jobs},
        "cv_uploads": {"used": user.tenant.cv_uploads_count, "limit": max_cv}
    }
    return APIResponse(success=True, data=data)

@router.post("/checkout", response_model=APIResponse[dict])
async def create_checkout(req: CheckoutRequest, user: CurrentUser = Depends(require_admin)):
    if not settings.STRIPE_SECRET_KEY:
        return APIResponse(success=True, data={"checkout_url": "/settings/billing?demo=true"})
        
    return APIResponse(success=True, data={"checkout_url": req.success_url})

@router.post("/webhook")
async def webhook(request: Request):
    # Dummy webhook for MVP
    logger.info("Stripe Webhook received")
    return {"status": "ok"}

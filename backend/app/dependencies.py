from dataclasses import dataclass
from fastapi import Header, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Tenant, Job
from app.services.auth_service import AuthService


@dataclass
class CurrentUser:
    id: str
    tenant_id: str
    role: str
    email: str
    full_name: str
    tenant: Tenant


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ", 1)[1]
    user, tenant = await AuthService.get_user_by_token(db, token)
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User deactivated")
    return CurrentUser(
        id=user.id, tenant_id=user.tenant_id, role=user.role,
        email=user.email, full_name=user.full_name, tenant=tenant,
    )


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_recruiter(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role == "viewer":
        raise HTTPException(status_code=403, detail="Recruiter access required")
    return user


async def check_job_limit(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if user.tenant.plan == "free":
        result = await db.execute(
            select(func.count(Job.id)).where(Job.tenant_id == user.tenant_id, Job.status == "published")
        )
        if (result.scalar() or 0) >= settings.FREE_MAX_JOBS:
            raise HTTPException(status_code=402, detail="Job limit reached. Upgrade to Pro.")


async def check_cv_limit(user: CurrentUser, db: AsyncSession) -> None:
    await db.refresh(user.tenant)
    if user.tenant.plan == "free" and user.tenant.cv_uploads_count >= settings.FREE_MAX_CV_UPLOADS:
        raise HTTPException(status_code=402, detail="CV upload limit reached. Upgrade to Pro.")

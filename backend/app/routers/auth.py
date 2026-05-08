from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import RegisterRequest, LoginRequest, LoginResponse, VerifyResponse, InviteRequest, APIResponse
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.dependencies import get_current_user, require_admin, CurrentUser
from app.models import User
from sqlalchemy import update, select
import uuid
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=APIResponse[LoginResponse])
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, tenant, token = await AuthService.register(
            db=db,
            company_name=req.company_name,
            full_name=req.full_name,
            email=req.email,
            password=req.password
        )
        await db.commit()
        return APIResponse(success=True, data=LoginResponse(
            access_token=token,
            user=user,
            tenant=tenant
        ))
    except Exception as e:
        await db.rollback()
        raise e

@router.post("/login", response_model=APIResponse[LoginResponse])
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user, tenant, token = await AuthService.login(db=db, email=req.email, password=req.password)
    return APIResponse(success=True, data=LoginResponse(
        access_token=token,
        user=user,
        tenant=tenant
    ))

@router.get("/verify", response_model=APIResponse[VerifyResponse])
async def verify(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy.sql import func
    await db.execute(update(User).where(User.id == user.id).values(last_seen=func.now()))
    await db.commit()

    db_user = (await db.execute(select(User).where(User.id == user.id))).scalars().first()
    return APIResponse(success=True, data=VerifyResponse(user=db_user, tenant=user.tenant))

@router.post("/invite", response_model=APIResponse[dict])
async def invite(req: InviteRequest, bg_tasks: BackgroundTasks, user: CurrentUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    try:
        temp_pass = str(uuid.uuid4())[:12]
        new_user = User(
            tenant_id=user.tenant_id,
            full_name=req.full_name,
            email=req.email,
            hashed_password=AuthService.get_password_hash(temp_pass),
            role=req.role,
            is_active=True
        )
        db.add(new_user)
        await db.commit()

        # In a real app, send an email with the temp password or a reset link.
        html = f"<p>You've been invited to {user.tenant.name} on RecruitAI.</p><p>Temporary password: {temp_pass}</p>"
        bg_tasks.add_task(EmailService.send_email, req.email, req.full_name, "You've been invited!", html, "invite", user.tenant_id)
        
        return APIResponse(success=True, data={"invited": True, "email": req.email})
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

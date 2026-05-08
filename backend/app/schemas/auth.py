from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserOut(BaseModel):
    id: str
    tenant_id: str
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    last_seen: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TenantOut(BaseModel):
    id: str
    name: str
    slug: str
    logo_url: Optional[str] = None
    plan: str
    is_active: bool
    cv_uploads_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    company_name: str
    full_name: str
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    tenant: TenantOut


class VerifyResponse(BaseModel):
    user: UserOut
    tenant: TenantOut


class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "recruiter"

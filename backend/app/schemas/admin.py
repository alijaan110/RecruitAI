from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AdminTenantOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    is_active: bool
    cv_uploads_count: int
    created_at: datetime
    user_count: int = 0
    job_count: int = 0
    application_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AdminUserOut(BaseModel):
    id: str
    tenant_id: str
    full_name: str
    email: str
    role: str
    is_active: bool
    last_seen: Optional[datetime] = None
    created_at: datetime
    tenant_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminStatsOut(BaseModel):
    total_tenants: int
    active_tenants: int
    total_users: int
    total_jobs: int
    total_candidates: int
    total_applications: int
    plan_breakdown: dict
    apps_last_7d: int
    apps_last_30d: int


class AdminUpdatePlanRequest(BaseModel):
    plan: str


class EmailLogOut(BaseModel):
    id: str
    tenant_id: str
    recipient_email: str
    recipient_name: Optional[str]
    template_name: str
    subject: str
    status: str
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemHealthOut(BaseModel):
    status: str
    db: dict
    llm: dict
    spacy: dict
    storage: dict
    uptime_seconds: int
    env: str


class SeedResult(BaseModel):
    seeded: bool
    tenants: int
    users: int
    jobs: int
    candidates: int
    applications: int
    note: str

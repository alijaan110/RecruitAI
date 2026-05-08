from datetime import datetime
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, EmailStr, ConfigDict


class CandidateBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    source: str = "direct"


class CandidateOut(CandidateBase):
    id: str
    tenant_id: str
    cv_file_name: Optional[str] = None
    parsed_data: Dict = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateListOut(CandidateOut):
    total_applications: Optional[int] = 0
    highest_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class CandidateApplicationOut(BaseModel):
    """Lightweight application summary for the candidate detail view."""
    id: str
    job_id: str
    job_title: Optional[str] = None
    stage: str
    overall_score: Optional[float] = None
    score_breakdown: Dict = {}
    is_starred: bool = False
    is_disqualified: bool = False
    disqualify_reason: Optional[str] = None
    applied_at: datetime
    last_stage_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateDetailOut(CandidateOut):
    applications: List[CandidateApplicationOut] = []

    model_config = ConfigDict(from_attributes=True)

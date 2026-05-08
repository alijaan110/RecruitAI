from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, List
from .candidate import CandidateOut
from .job import JobOut

class StageHistoryOut(BaseModel):
    id: str
    from_stage: Optional[str]
    to_stage: str
    changed_by: Optional[str]
    changed_by_name: Optional[str]
    note: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CandidateNoteOut(BaseModel):
    id: str
    author_id: str
    author_name: str
    note_type: str
    content: str
    is_private: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ApplicationOut(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    stage: str
    keyword_score: Optional[float]
    overall_score: Optional[float]
    score_breakdown: Dict
    is_starred: bool
    is_disqualified: bool
    disqualify_reason: Optional[str]
    cover_letter: Optional[str]
    applied_at: datetime
    last_stage_at: datetime
    
    # from joins
    candidate: Optional[CandidateOut] = None
    job: Optional[JobOut] = None

    model_config = ConfigDict(from_attributes=True)

class ApplicationDetailOut(ApplicationOut):
    stage_history: List[StageHistoryOut] = []
    notes: List[CandidateNoteOut] = []
    cv_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ApplicationStageUpdate(BaseModel):
    stage: str
    note: Optional[str] = None

class ApplicationStarUpdate(BaseModel):
    is_starred: bool

class ApplicationDisqualify(BaseModel):
    reason: str

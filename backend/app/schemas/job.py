from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

class JobCreate(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: str = "full_time"
    description: str
    requirements: List[str] = []
    nice_to_have: List[str] = []
    keywords: List[str] = []
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    nice_to_have: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None

class JobOut(BaseModel):
    id: str
    title: str
    department: Optional[str]
    location: Optional[str]
    employment_type: str
    description: str
    requirements: List[str]
    nice_to_have: List[str]
    keywords: List[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: str
    status: str
    public_slug: Optional[str]
    closes_at: Optional[datetime]
    published_at: Optional[datetime]
    created_at: datetime
    
    # Extras from joins
    total_applications: Optional[int] = 0
    apps_by_stage: Optional[dict] = {}

    model_config = ConfigDict(from_attributes=True)

class PublicJobOut(BaseModel):
    id: str
    title: str
    department: Optional[str]
    location: Optional[str]
    employment_type: str
    description: str
    requirements: List[str]
    nice_to_have: List[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: str
    public_slug: str
    closes_at: Optional[datetime]
    published_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class PublicCompanyBoardOut(BaseModel):
    tenant: dict
    jobs: List[PublicJobOut]

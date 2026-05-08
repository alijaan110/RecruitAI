from pydantic import BaseModel
from typing import Dict

class PlanUsageItem(BaseModel):
    used: int
    limit: int

class PlanUsageOut(BaseModel):
    plan: str
    active_jobs: PlanUsageItem
    cv_uploads: PlanUsageItem
    
class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str
    
class PortalRequest(BaseModel):
    return_url: str

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LLMConfigOut(BaseModel):
    id: str
    tenant_id: Optional[str] = None
    provider: str
    model_name: str
    api_key: Optional[str] = None
    temperature: float
    max_tokens: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LLMConfigUpsert(BaseModel):
    provider: str = "mock"
    model_name: str = "mock-model"
    api_key: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 1000
    is_active: bool = True


class LLMTestRequest(BaseModel):
    provider: str
    model_name: str
    api_key: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 200


class LLMTestResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
    latency_ms: int


class LLMProvidersOut(BaseModel):
    providers: dict

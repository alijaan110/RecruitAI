from typing import Any, Generic, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    message: str | None = None
    error: str | None = None
    code: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    pages: int
    
    model_config = ConfigDict(from_attributes=True)

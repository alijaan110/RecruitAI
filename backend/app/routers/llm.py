from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin, CurrentUser
from app.models import LLMConfig
from app.schemas import (
    APIResponse, LLMConfigOut, LLMConfigUpsert, LLMTestRequest, LLMTestResponse, LLMProvidersOut,
)
from app.services.llm_service import LLMService

router = APIRouter(prefix="/llm", tags=["llm"])


PROVIDERS = {
    "mock": {
        "label": "Mock (no API key required)",
        "models": ["mock-model"],
        "supports_test": True,
    },
    "openai": {
        "label": "OpenAI",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        "supports_test": True,
    },
    "gemini": {
        "label": "Google Gemini",
        "models": ["gemini-1.5-flash", "gemini-1.5-pro"],
        "supports_test": True,
    },
    "deepseek": {
        "label": "DeepSeek",
        "models": ["deepseek-chat", "deepseek-coder"],
        "supports_test": True,
    },
}


@router.get("/providers", response_model=APIResponse[LLMProvidersOut])
async def list_providers(_: CurrentUser = Depends(require_admin)):
    return APIResponse(success=True, data=LLMProvidersOut(providers=PROVIDERS))


@router.get("/config", response_model=APIResponse[LLMConfigOut | None])
async def get_config(user: CurrentUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(LLMConfig).where(LLMConfig.tenant_id == user.tenant_id))
    cfg = res.scalars().first()
    if not cfg:
        return APIResponse(success=True, data=None)
    out = LLMConfigOut.model_validate(cfg).model_dump()
    out["api_key"] = "****" if cfg.api_key else None
    return APIResponse(success=True, data=out)


@router.put("/config", response_model=APIResponse[LLMConfigOut])
async def upsert_config(req: LLMConfigUpsert, user: CurrentUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(LLMConfig).where(LLMConfig.tenant_id == user.tenant_id))
    cfg = res.scalars().first()
    if cfg:
        cfg.provider = req.provider
        cfg.model_name = req.model_name
        if req.api_key is not None and req.api_key != "" and req.api_key != "****":
            cfg.api_key = req.api_key
        cfg.temperature = req.temperature
        cfg.max_tokens = req.max_tokens
        cfg.is_active = req.is_active
    else:
        cfg = LLMConfig(
            tenant_id=user.tenant_id, provider=req.provider, model_name=req.model_name,
            api_key=req.api_key, temperature=req.temperature, max_tokens=req.max_tokens,
            is_active=req.is_active,
        )
        db.add(cfg)
    await db.commit()
    await db.refresh(cfg)
    out = LLMConfigOut.model_validate(cfg).model_dump()
    out["api_key"] = "****" if cfg.api_key else None
    return APIResponse(success=True, data=out)


@router.delete("/config", response_model=APIResponse[dict])
async def delete_config(user: CurrentUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(LLMConfig).where(LLMConfig.tenant_id == user.tenant_id))
    await db.commit()
    return APIResponse(success=True, data={"deleted": True})


@router.post("/test", response_model=APIResponse[LLMTestResponse])
async def test_connection(req: LLMTestRequest, user: CurrentUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    api_key = req.api_key
    if api_key in (None, "", "****"):
        existing = (await db.execute(select(LLMConfig).where(LLMConfig.tenant_id == user.tenant_id))).scalars().first()
        api_key = existing.api_key if existing else ""
    result = await LLMService.test_connection(req.provider, req.model_name, api_key or "", req.temperature, req.max_tokens)
    return APIResponse(success=True, data=LLMTestResponse(**result))

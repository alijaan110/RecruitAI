"""LLM router supporting mock / openai / gemini / deepseek providers.

Hardening notes
---------------
- Forces JSON output mode where the provider supports it (openai response_format,
  gemini responseMimeType, deepseek response_format).
- Two retry attempts with exponential backoff on transient failures.
- `complete_json()` returns a strict result envelope: {success, data, error,
  latency_ms, provider, model} — caller decides whether to fall back, never
  silently substitutes mock data.
- The legacy `complete()` and `score_cv()` are preserved for backwards
  compatibility (admin LLM test, single-agent path).
"""
from __future__ import annotations

import asyncio
import json
import random
import re
import time
from typing import Optional, Tuple

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import LLMConfig

logger = structlog.get_logger()


class LLMService:
    # ---------- config resolution ----------

    @staticmethod
    async def get_config(tenant_id: Optional[str], db: AsyncSession) -> dict:
        """Resolve config: tenant override → global → settings default."""
        if tenant_id:
            r = await db.execute(
                select(LLMConfig).where(
                    LLMConfig.tenant_id == tenant_id, LLMConfig.is_active == True
                )
            )
            tenant_cfg = r.scalars().first()
            if tenant_cfg:
                return LLMService._cfg_to_dict(tenant_cfg)

        r = await db.execute(
            select(LLMConfig).where(
                LLMConfig.tenant_id.is_(None), LLMConfig.is_active == True
            )
        )
        global_cfg = r.scalars().first()
        if global_cfg:
            return LLMService._cfg_to_dict(global_cfg)

        return {
            "provider": settings.DEFAULT_LLM_PROVIDER,
            "model_name": settings.DEFAULT_LLM_MODEL,
            "api_key": "",
            "temperature": 0.2,
            "max_tokens": 1000,
        }

    @staticmethod
    def _cfg_to_dict(cfg: LLMConfig) -> dict:
        return {
            "provider": cfg.provider,
            "model_name": cfg.model_name,
            "api_key": cfg.api_key or "",
            "temperature": float(cfg.temperature),
            "max_tokens": int(cfg.max_tokens),
        }

    # ---------- structured (JSON-mode) call ----------

    @classmethod
    async def complete_json(
        cls,
        prompt: str,
        system: str,
        tenant_id: Optional[str],
        db: AsyncSession,
        *,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        retries: int = 2,
    ) -> dict:
        """Call the configured LLM in JSON mode and parse the result.

        Returns:
            {
              "success": bool,
              "data": dict|None,        # parsed JSON when success
              "error": str|None,        # error string when not success
              "raw": str|None,          # raw provider output (truncated)
              "latency_ms": int,
              "provider": str,
              "model": str,
              "fell_back_to_mock": bool, # True if api_key missing -> mock
            }
        """
        cfg = await cls.get_config(tenant_id, db)
        if temperature is not None:
            cfg["temperature"] = temperature
        if max_tokens is not None:
            cfg["max_tokens"] = max_tokens

        provider = cfg["provider"]
        fell_back_to_mock = False

        if provider == "mock" or not cfg.get("api_key"):
            fell_back_to_mock = provider != "mock"
            provider = "mock"

        last_err: Optional[str] = None
        for attempt in range(retries + 1):
            start = time.time()
            try:
                if provider == "mock":
                    raw = cls._mock(prompt, system)
                elif provider == "openai":
                    raw = await cls._openai_json(prompt, system, cfg)
                elif provider == "gemini":
                    raw = await cls._gemini_json(prompt, system, cfg)
                elif provider == "deepseek":
                    raw = await cls._deepseek_json(prompt, system, cfg)
                else:
                    return {
                        "success": False, "data": None,
                        "error": f"Unknown provider: {provider}", "raw": None,
                        "latency_ms": 0, "provider": provider,
                        "model": cfg["model_name"], "fell_back_to_mock": fell_back_to_mock,
                    }

                latency_ms = int((time.time() - start) * 1000)
                parsed = cls._parse_json_strict(raw)
                if parsed is None:
                    last_err = "JSON parse failed"
                    if attempt < retries:
                        await asyncio.sleep(0.5 * (2 ** attempt))
                        continue
                    return {
                        "success": False, "data": None, "error": last_err,
                        "raw": (raw or "")[:1000], "latency_ms": latency_ms,
                        "provider": provider, "model": cfg["model_name"],
                        "fell_back_to_mock": fell_back_to_mock,
                    }
                return {
                    "success": True, "data": parsed, "error": None,
                    "raw": None, "latency_ms": latency_ms,
                    "provider": provider, "model": cfg["model_name"],
                    "fell_back_to_mock": fell_back_to_mock,
                }
            except httpx.HTTPStatusError as e:
                # 429 / 5xx are retryable
                if e.response.status_code in (408, 425, 429, 500, 502, 503, 504) and attempt < retries:
                    await asyncio.sleep(0.5 * (2 ** attempt))
                    last_err = f"HTTP {e.response.status_code}"
                    continue
                latency_ms = int((time.time() - start) * 1000)
                return {
                    "success": False, "data": None,
                    "error": f"HTTP {e.response.status_code}: {e.response.text[:300]}",
                    "raw": None, "latency_ms": latency_ms,
                    "provider": provider, "model": cfg["model_name"],
                    "fell_back_to_mock": fell_back_to_mock,
                }
            except Exception as e:
                if attempt < retries:
                    await asyncio.sleep(0.5 * (2 ** attempt))
                    last_err = str(e)
                    continue
                latency_ms = int((time.time() - start) * 1000)
                logger.error("LLM call failed", provider=provider, error=str(e))
                return {
                    "success": False, "data": None, "error": str(e)[:300],
                    "raw": None, "latency_ms": latency_ms,
                    "provider": provider, "model": cfg["model_name"],
                    "fell_back_to_mock": fell_back_to_mock,
                }

        return {
            "success": False, "data": None, "error": last_err or "exhausted retries",
            "raw": None, "latency_ms": 0, "provider": provider,
            "model": cfg["model_name"], "fell_back_to_mock": fell_back_to_mock,
        }

    # ---------- legacy: free-form text ----------

    @classmethod
    async def complete(cls, prompt: str, system: str, tenant_id: Optional[str], db: AsyncSession) -> str:
        cfg = await cls.get_config(tenant_id, db)
        provider = cfg["provider"]
        try:
            if provider == "mock" or not cfg.get("api_key"):
                return cls._mock(prompt, system)
            if provider == "openai":
                return await cls._openai_text(prompt, system, cfg)
            if provider == "gemini":
                return await cls._gemini_text(prompt, system, cfg)
            if provider == "deepseek":
                return await cls._deepseek_text(prompt, system, cfg)
            return cls._mock(prompt, system)
        except Exception as e:
            logger.warning("LLM provider failed (legacy text path)", provider=provider, error=str(e))
            return cls._mock(prompt, system)

    # ---------- mock provider ----------

    @staticmethod
    def _mock(prompt: str, system: str) -> str:
        sysl = (system or "").lower()
        if "skill" in sysl:
            return json.dumps({
                "matched_skills": [
                    {"skill": "React", "evidence": "led the React migration", "confidence": 0.9, "transferable_from": None},
                    {"skill": "TypeScript", "evidence": "TypeScript across the codebase", "confidence": 0.9, "transferable_from": None},
                ],
                "missing_critical": [],
                "missing_nice_to_have": ["GraphQL"],
                "score": random.randint(60, 90),
                "rationale": "Mock skills match: solid alignment with stated requirements based on parsed skills."
            })
        if "experience" in sysl or "relevant" in sysl:
            return json.dumps({
                "relevance_score": random.randint(55, 85),
                "total_years_estimate": 4,
                "relevant_years_estimate": 3,
                "trajectory": "growing",
                "highlight_roles": [{"role": "Senior Engineer at Mock Co", "years": 2, "relevance": 0.85, "evidence": "led greenfield rebuild"}],
                "rationale": "Mock experience eval: relevant trajectory in similar industry."
            })
        if "concern" in sysl or "red flag" in sysl:
            return json.dumps({"concerns": []})
        if "synth" in sysl or "hiring manager" in sysl:
            score = random.randint(60, 85)
            return json.dumps({
                "overall_score": score,
                "recommendation": "shortlist" if score >= 70 else "review",
                "headline": "Mock candidate summary — solid match with one or two gaps to clarify.",
                "strengths": ["Mock strength 1", "Mock strength 2", "Mock strength 3"],
                "gaps": ["Mock gap 1", "Mock gap 2"],
                "interview_questions": [
                    "Walk through the most complex system you shipped.",
                    "Describe a tough debugging session and what you learned.",
                    "How do you decide build vs. buy?",
                    "Describe a stakeholder disagreement and the resolution.",
                    "Where do you want to be in 3 years?"
                ],
                "confidence": 0.6,
                "reasoning": "Mock synthesis: borderline shortlist; recommend review."
            })
        # default
        return json.dumps({"overall_score": random.randint(60, 80), "summary": "mock"})

    # ---------- openai ----------

    @staticmethod
    async def _openai_json(prompt: str, system: str, cfg: dict) -> str:
        async with httpx.AsyncClient(timeout=45.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {cfg['api_key']}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": cfg["model_name"] or "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": cfg["temperature"],
                    "max_tokens": cfg["max_tokens"],
                    "response_format": {"type": "json_object"},
                },
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

    @staticmethod
    async def _openai_text(prompt: str, system: str, cfg: dict) -> str:
        async with httpx.AsyncClient(timeout=45.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
                json={
                    "model": cfg["model_name"] or "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": cfg["temperature"],
                    "max_tokens": cfg["max_tokens"],
                },
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

    # ---------- gemini ----------

    @staticmethod
    async def _gemini_json(prompt: str, system: str, cfg: dict) -> str:
        model = cfg["model_name"] or "gemini-1.5-flash"
        async with httpx.AsyncClient(timeout=45.0) as client:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={cfg['api_key']}",
                headers={"Content-Type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": system}]},
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": cfg["temperature"],
                        "maxOutputTokens": cfg["max_tokens"],
                        "responseMimeType": "application/json",
                    },
                },
            )
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]

    @staticmethod
    async def _gemini_text(prompt: str, system: str, cfg: dict) -> str:
        model = cfg["model_name"] or "gemini-1.5-flash"
        async with httpx.AsyncClient(timeout=45.0) as client:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={cfg['api_key']}",
                headers={"Content-Type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": system}]},
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": cfg["temperature"], "maxOutputTokens": cfg["max_tokens"]},
                },
            )
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]

    # ---------- deepseek ----------

    @staticmethod
    async def _deepseek_json(prompt: str, system: str, cfg: dict) -> str:
        async with httpx.AsyncClient(timeout=45.0) as client:
            r = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
                json={
                    "model": cfg["model_name"] or "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": cfg["temperature"],
                    "max_tokens": cfg["max_tokens"],
                    "response_format": {"type": "json_object"},
                },
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

    @staticmethod
    async def _deepseek_text(prompt: str, system: str, cfg: dict) -> str:
        async with httpx.AsyncClient(timeout=45.0) as client:
            r = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
                json={
                    "model": cfg["model_name"] or "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": cfg["temperature"],
                    "max_tokens": cfg["max_tokens"],
                },
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

    # ---------- legacy compat ----------

    @classmethod
    async def score_cv(cls, cv_text: str, parsed_data: dict, job: dict, tenant_id: str, db: AsyncSession) -> dict:
        """Single-agent scoring kept for compatibility with the admin LLM test.

        New evaluations should go through `EvaluationService.evaluate(...)`.
        """
        from app.services.evaluation_service import EvaluationService
        result = await EvaluationService.evaluate(
            cv_text=cv_text, parsed_data=parsed_data, job=job,
            tenant_id=tenant_id, db=db, tfidf_score=0.0,
        )
        return result

    @classmethod
    async def generate_jd(cls, role: str, keywords: list, tenant_id: str, db: AsyncSession) -> str:
        return await cls.complete(
            prompt=f"Write a 250-word job description for: {role}. Required keywords: {', '.join(keywords)}.",
            system="You are an expert recruiter writing concise, candidate-friendly JDs.",
            tenant_id=tenant_id, db=db,
        )

    # ---------- JSON helpers ----------

    @staticmethod
    def _parse_json_strict(raw: Optional[str]) -> Optional[dict]:
        """Robustly extract a JSON object from a model response.

        Handles markdown-wrapped JSON, leading prose, trailing prose. Returns
        None if no valid JSON object can be recovered.
        """
        if not raw:
            return None
        # Try direct parse first (the common case under JSON mode).
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else None
        except Exception:
            pass
        # Strip markdown fences.
        stripped = re.sub(r"```(?:json)?\s*", "", raw)
        stripped = stripped.replace("```", "")
        try:
            data = json.loads(stripped)
            return data if isinstance(data, dict) else None
        except Exception:
            pass
        # Last resort: find the first {...} block and try.
        match = re.search(r"\{[\s\S]*\}", stripped)
        if match:
            try:
                data = json.loads(match.group(0))
                return data if isinstance(data, dict) else None
            except Exception:
                return None
        return None

    # ---------- connection test ----------

    @classmethod
    async def test_connection(cls, provider: str, model_name: str, api_key: str,
                              temperature: float = 0.7, max_tokens: int = 200) -> dict:
        cfg = {"provider": provider, "model_name": model_name, "api_key": api_key,
               "temperature": temperature, "max_tokens": max_tokens}
        start = time.time()
        try:
            if provider == "mock" or not api_key:
                resp = cls._mock("Hello", "You are a friendly assistant.")
            elif provider == "openai":
                resp = await cls._openai_text("Reply with exactly: pong.", "Connectivity test.", cfg)
            elif provider == "gemini":
                resp = await cls._gemini_text("Reply with exactly: pong.", "Connectivity test.", cfg)
            elif provider == "deepseek":
                resp = await cls._deepseek_text("Reply with exactly: pong.", "Connectivity test.", cfg)
            else:
                return {"success": False, "error": f"Unknown provider: {provider}", "latency_ms": 0}
            return {"success": True, "response": resp[:500], "latency_ms": int((time.time() - start) * 1000)}
        except httpx.HTTPStatusError as e:
            return {"success": False, "error": f"HTTP {e.response.status_code}: {e.response.text[:300]}",
                    "latency_ms": int((time.time() - start) * 1000)}
        except Exception as e:
            return {"success": False, "error": str(e)[:300], "latency_ms": int((time.time() - start) * 1000)}

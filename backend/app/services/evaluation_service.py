"""Multi-agent ATS evaluation pipeline.

Pipeline
--------
1. Skills agent     -- semantic skills match with evidence
2. Experience agent -- relevance of prior roles to THIS job
3. Concerns agent   -- interview questions for unclear areas (never rejects)
                       (1, 2, 3 run in parallel)
4. Synthesizer      -- final score + recommendation + 5 tailored questions
                       (sees outputs of 1, 2, 3 + the deterministic blend)

Reliability guarantees
----------------------
- Each call uses `LLMService.complete_json` which forces JSON output, retries
  twice on transient HTTP errors, and parses defensively.
- If any agent fails, its slot in the result is `{"status":"error", "error":...}`
  but the overall evaluation continues — synthesizer adapts.
- If the synthesizer fails, we fall back to a deterministic blend built from
  whichever upstream agents succeeded plus the TF-IDF score.
- Final recommendation is *bounded* by deterministic rules — no agent can
  unilaterally output `skip` for a candidate scoring above the floor.

The `evaluate` method always returns a fully-formed dict that the UI can
render, including a `meta` section with per-agent latency, provider, and
fall-back-to-mock flag for trust and observability.
"""
from __future__ import annotations

import asyncio
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_service import LLMService
from app.services.prompts import (
    SKILLS_SYSTEM, SKILLS_USER_TEMPLATE,
    EXPERIENCE_SYSTEM, EXPERIENCE_USER_TEMPLATE,
    CONCERNS_SYSTEM, CONCERNS_USER_TEMPLATE,
    SYNTHESIZER_SYSTEM, SYNTHESIZER_USER_TEMPLATE,
)

logger = structlog.get_logger()


def _trunc(s: str | None, n: int) -> str:
    return (s or "")[:n]


class EvaluationService:
    @classmethod
    async def evaluate(
        cls,
        cv_text: str,
        parsed_data: dict,
        job: dict,
        tenant_id: str,
        db: AsyncSession,
        tfidf_score: float = 0.0,
    ) -> dict:
        """Run the full multi-agent evaluation. Always returns a usable dict."""
        cv_text = cv_text or ""
        parsed_data = parsed_data or {}
        parsed_skills = parsed_data.get("skills", []) or []
        total_months = int(parsed_data.get("total_experience_months", 0) or 0)

        skills_user = SKILLS_USER_TEMPLATE.format(
            job_title=job.get("title", ""),
            keywords=", ".join(job.get("keywords") or []),
            requirements=", ".join(job.get("requirements") or []),
            nice_to_have=", ".join(job.get("nice_to_have") or []),
            description=_trunc(job.get("description"), 1500),
            parsed_skills=", ".join(parsed_skills),
            cv_text=_trunc(cv_text, 4000),
        )
        experience_user = EXPERIENCE_USER_TEMPLATE.format(
            job_title=job.get("title", ""),
            requirements=", ".join(job.get("requirements") or []),
            description=_trunc(job.get("description"), 1500),
            total_months=total_months,
            parsed_skills=", ".join(parsed_skills),
            cv_text=_trunc(cv_text, 4000),
        )
        concerns_user = CONCERNS_USER_TEMPLATE.format(
            job_title=job.get("title", ""),
            description=_trunc(job.get("description"), 1000),
            cv_text=_trunc(cv_text, 4000),
        )

        # Run the three upstream agents in parallel for speed.
        skills_task = LLMService.complete_json(
            skills_user, SKILLS_SYSTEM, tenant_id, db, temperature=0.2, max_tokens=900,
        )
        experience_task = LLMService.complete_json(
            experience_user, EXPERIENCE_SYSTEM, tenant_id, db, temperature=0.2, max_tokens=800,
        )
        concerns_task = LLMService.complete_json(
            concerns_user, CONCERNS_SYSTEM, tenant_id, db, temperature=0.2, max_tokens=600,
        )
        skills_res, experience_res, concerns_res = await asyncio.gather(
            skills_task, experience_task, concerns_task, return_exceptions=False,
        )

        # Extract numeric scores (with safe fallbacks).
        skills_score = cls._safe_score(skills_res, "score", default=50)
        experience_score = cls._safe_score(experience_res, "relevance_score", default=50)

        # Deterministic blended score: TF-IDF 20% + Skills 40% + Experience 40%.
        # Bounded to [0, 100], rounded to 1 decimal.
        blended = round(
            min(100.0, max(0.0, tfidf_score * 0.2 + skills_score * 0.4 + experience_score * 0.4)),
            1,
        )

        # Synthesizer
        synth_user = SYNTHESIZER_USER_TEMPLATE.format(
            job_title=job.get("title", ""),
            skills_json=cls._stringify(skills_res),
            experience_json=cls._stringify(experience_res),
            concerns_json=cls._stringify(concerns_res),
            blended_score=blended,
            tfidf_score=round(tfidf_score, 1),
        )
        synth_res = await LLMService.complete_json(
            synth_user, SYNTHESIZER_SYSTEM, tenant_id, db, temperature=0.3, max_tokens=1100,
        )

        synth_data = synth_res.get("data") if synth_res.get("success") else None

        # Apply hard rules to the synthesizer output (defense in depth).
        recommendation, final_score, headline, strengths, gaps, questions, confidence, reasoning = (
            cls._apply_hard_rules(
                synth_data=synth_data,
                blended=blended,
                skills_score=skills_score,
                experience_score=experience_score,
                concerns=concerns_res.get("data") or {},
            )
        )

        # Build the final structured result (always renderable).
        return {
            "overall_score": final_score,
            "recommendation": recommendation,
            "headline": headline,
            "strengths": strengths,
            "gaps": gaps,
            "interview_questions": questions,
            "confidence": confidence,
            "reasoning": reasoning,
            "skills": cls._unwrap(skills_res),
            "experience": cls._unwrap(experience_res),
            "concerns": cls._unwrap(concerns_res).get("concerns", []),
            "blend": {
                "tfidf_score": round(tfidf_score, 1),
                "skills_score": skills_score,
                "experience_score": experience_score,
                "blended_score": blended,
                "weights": {"tfidf": 0.2, "skills": 0.4, "experience": 0.4},
            },
            "meta": {
                "agents": {
                    "skills": cls._meta(skills_res),
                    "experience": cls._meta(experience_res),
                    "concerns": cls._meta(concerns_res),
                    "synthesizer": cls._meta(synth_res),
                },
                "fell_back_to_mock": any(
                    r.get("fell_back_to_mock") for r in (skills_res, experience_res, concerns_res, synth_res)
                ),
                "any_agent_failed": any(
                    not r.get("success") for r in (skills_res, experience_res, concerns_res, synth_res)
                ),
            },
        }

    # ----------------------------------------------------------------------

    @staticmethod
    def _safe_score(res: dict, key: str, default: int = 50) -> float:
        if not res or not res.get("success"):
            return float(default)
        data = res.get("data") or {}
        v = data.get(key)
        try:
            return max(0.0, min(100.0, float(v)))
        except (TypeError, ValueError):
            return float(default)

    @staticmethod
    def _stringify(res: dict) -> str:
        import json as _json
        if res.get("success"):
            return _json.dumps(res.get("data") or {}, ensure_ascii=False)[:2000]
        return _json.dumps({"status": "error", "error": res.get("error") or "unknown"})

    @staticmethod
    def _unwrap(res: dict) -> dict:
        if res.get("success"):
            return res.get("data") or {}
        return {"status": "error", "error": res.get("error") or "unknown"}

    @staticmethod
    def _meta(res: dict) -> dict:
        return {
            "success": bool(res.get("success")),
            "provider": res.get("provider"),
            "model": res.get("model"),
            "latency_ms": int(res.get("latency_ms") or 0),
            "error": res.get("error"),
            "fell_back_to_mock": bool(res.get("fell_back_to_mock")),
        }

    @staticmethod
    def _apply_hard_rules(
        synth_data: Optional[dict],
        blended: float,
        skills_score: float,
        experience_score: float,
        concerns: dict,
    ):
        """Bound the synthesizer's recommendation by deterministic rules.

        Production-grade safety net: even if the LLM hallucinates a 'skip',
        we keep the candidate in 'review' unless multiple signals agree.
        """
        # Defaults if synthesizer failed.
        synth = synth_data or {}
        score = synth.get("overall_score")
        try:
            score = float(score)
            if not (0 <= score <= 100):
                raise ValueError
        except (TypeError, ValueError):
            score = blended

        # Recommendation rules:
        # - shortlist: blended ≥ 70 AND skills ≥ 60 AND experience ≥ 55
        # - skip:      blended < 30 AND skills < 30 AND experience < 30 (ALL must agree)
        # - review:    everything else (default to keep humans in the loop)
        if blended >= 70 and skills_score >= 60 and experience_score >= 55:
            recommendation = "shortlist"
        elif blended < 30 and skills_score < 30 and experience_score < 30:
            recommendation = "skip"
        else:
            recommendation = "review"

        # Honour LLM upgrade to shortlist if the LLM is more confident than the rules.
        # (Don't allow the LLM to *downgrade* a candidate the rules wanted to shortlist.)
        llm_rec = (synth.get("recommendation") or "").lower()
        if recommendation == "review" and llm_rec == "shortlist" and skills_score >= 55:
            recommendation = "shortlist"
        # Never honour LLM "skip" — fail safe, send to review.

        headline = synth.get("headline") or "Evaluation completed."
        strengths = synth.get("strengths") or []
        gaps = synth.get("gaps") or []
        questions = synth.get("interview_questions") or []
        confidence = synth.get("confidence")
        try:
            confidence = max(0.0, min(1.0, float(confidence))) if confidence is not None else 0.6
        except (TypeError, ValueError):
            confidence = 0.6
        reasoning = synth.get("reasoning") or (
            f"Blended score {blended:.1f} (skills {skills_score:.0f}, experience {experience_score:.0f}). "
            f"Recommendation '{recommendation}' applied by hard rules."
        )

        # If synthesizer failed entirely, fabricate sane defaults from upstream.
        if not strengths and not questions and synth_data is None:
            strengths = ["Score derived from blended skills and experience signals."]
            gaps = ["Synthesizer agent unavailable — review upstream agents directly."]
            questions = [
                "Tell me about a project that best showcases the skills required for this role.",
                "Walk me through your most recent role and what you owned end-to-end.",
                "What's the trickiest production issue you've debugged?",
                "How do you decide between shipping fast vs. building durable foundations?",
                "What kind of team and feedback environment helps you do your best work?",
            ]

        return recommendation, round(score, 1), headline, strengths, gaps, questions, confidence, reasoning

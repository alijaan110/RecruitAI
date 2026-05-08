"""Idempotent seed script. Run from repo root with `python db/seed.py`.

Reads `db/seed_data.json` and creates 3 tenants, users, jobs, candidates,
applications, stage history, and a global LLMConfig.

Safe to run multiple times — existing rows are skipped (looked up by slug/email/title).
"""
import asyncio
import json
import os
import sys
import uuid
from slugify import slugify

# Add backend dir to path so we can import the app package.
ROOT = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, "..", "backend")))

from sqlalchemy import select
from app.database import AsyncSessionLocal, init_db, is_sqlite
from app.models import (
    Tenant, User, Job, Candidate, Application, StageHistory, CandidateNote, LLMConfig
)
from app.services.auth_service import AuthService


async def seed():
    if is_sqlite:
        await init_db()

    with open(os.path.join(ROOT, "seed_data.json"), "r", encoding="utf-8") as f:
        data = json.load(f)

    async with AsyncSessionLocal() as db:
        print("Seeding tenants…")
        tenant_map: dict[str, Tenant] = {}
        for t_data in data["tenants"]:
            existing = (await db.execute(select(Tenant).where(Tenant.slug == t_data["slug"]))).scalars().first()
            if existing:
                tenant_map[t_data["slug"]] = existing
                continue
            t = Tenant(name=t_data["name"], slug=t_data["slug"], plan=t_data["plan"])
            db.add(t)
            await db.flush()
            tenant_map[t_data["slug"]] = t

        print("Seeding users…")
        user_map: dict[str, User] = {}
        for u_data in data["users"]:
            existing = (await db.execute(select(User).where(User.email == u_data["email"]))).scalars().first()
            if existing:
                user_map[u_data["email"]] = existing
                continue
            user = User(
                tenant_id=tenant_map[u_data["tenant"]].id,
                full_name=u_data["full_name"],
                email=u_data["email"],
                hashed_password=AuthService.get_password_hash(u_data["password"]),
                role=u_data["role"],
                is_active=True,
            )
            db.add(user)
            await db.flush()
            user_map[u_data["email"]] = user

        print("Seeding jobs…")
        job_map: dict[str, Job] = {}
        for j_data in data["jobs"]:
            tenant = tenant_map[j_data["tenant"]]
            existing = (await db.execute(
                select(Job).where(Job.tenant_id == tenant.id, Job.title == j_data["title"])
            )).scalars().first()
            key = f"{tenant.slug}-{j_data['title']}"
            if existing:
                job_map[key] = existing
                continue
            admin_user = next((u for u in user_map.values() if u.tenant_id == tenant.id and u.role == "admin"), None)
            if not admin_user:
                continue
            slug_value = j_data.get("public_slug") or f"{slugify(j_data['title'])}-{str(uuid.uuid4())[:6]}"
            job = Job(
                tenant_id=tenant.id, created_by=admin_user.id,
                title=j_data["title"], department=j_data.get("department"),
                location=j_data.get("location"), employment_type=j_data["employment_type"],
                description=j_data["description"], requirements=j_data["requirements"],
                nice_to_have=[], keywords=j_data["keywords"],
                status=j_data["status"], public_slug=slug_value,
            )
            db.add(job)
            await db.flush()
            job_map[key] = job

        print("Seeding candidates…")
        candidate_map: dict[str, Candidate] = {}
        for c_data in data["candidates"]:
            tenant = tenant_map[c_data["tenant"]]
            existing = (await db.execute(
                select(Candidate).where(Candidate.tenant_id == tenant.id, Candidate.email == c_data["email"])
            )).scalars().first()
            if existing:
                candidate_map[c_data["email"]] = existing
                continue
            candidate = Candidate(
                tenant_id=tenant.id,
                full_name=c_data["full_name"],
                email=c_data["email"],
                source="direct",
                parsed_data={
                    "skills": c_data["skills"],
                    "total_experience_months": 36,
                    "experience": [], "education": [], "languages": [], "summary": "",
                },
            )
            db.add(candidate)
            await db.flush()
            candidate_map[c_data["email"]] = candidate

        print("Seeding applications…")
        for a_data in data["applications"]:
            candidate = candidate_map.get(a_data["candidate_email"])
            if not candidate:
                continue
            tenant_slug = next((slug for slug, t in tenant_map.items() if t.id == candidate.tenant_id), None)
            if not tenant_slug:
                continue
            job = job_map.get(f"{tenant_slug}-{a_data['job_title']}")
            if not job:
                continue

            existing = (await db.execute(
                select(Application).where(Application.job_id == job.id, Application.candidate_id == candidate.id)
            )).scalars().first()
            if existing:
                continue

            score = float(a_data["score"])
            app = Application(
                tenant_id=candidate.tenant_id, job_id=job.id, candidate_id=candidate.id,
                stage=a_data["stage"],
                keyword_score=round(score * 0.9, 2),
                overall_score=score,
                score_breakdown={
                    "keyword_score": round(score * 0.9, 2),
                    "skills_match": round(score * 0.95, 2),
                    "experience_score": 70.0,
                    "overall_score": score,
                    "matched_keywords": candidate.parsed_data.get("skills", []),
                    "missing_keywords": [k for k in (job.keywords or []) if k not in candidate.parsed_data.get("skills", [])],
                    "llm_analysis": {
                        "overall_score": int(score),
                        "keyword_match": int(score * 0.95),
                        "skills_alignment": int(score * 0.9),
                        "experience_relevance": 70,
                        "communication_quality": 80,
                        "strengths": ["Strong technical foundation", "Relevant prior projects", "Clear written communication"],
                        "gaps": ["Limited exposure to one of the niche tools", "Could deepen leadership experience"],
                        "interview_questions": [
                            "Walk me through a complex system you shipped.",
                            "Describe a tough debugging session.",
                            "How do you balance speed vs. quality?",
                            "Tell me about a stakeholder disagreement.",
                            "Where do you see yourself in 3 years?",
                        ],
                        "recommendation": "shortlist" if score >= 70 else ("review" if score >= 55 else "skip"),
                        "summary": f"Candidate scored {int(score)}/100 against the {job.title} JD."
                    },
                },
            )
            db.add(app)
            await db.flush()

            # Stage history
            ladder = ["received", "screening", "interview", "offer", "hired"]
            target = a_data["stage"]
            if target == "rejected":
                walk = ["received", "screening", "rejected"]
            elif target in ladder:
                walk = ladder[: ladder.index(target) + 1]
            else:
                walk = ["received"]
            admin_user = next((u for u in user_map.values() if u.tenant_id == candidate.tenant_id and u.role == "admin"), None)
            prev = walk[0]
            for s in walk[1:]:
                db.add(StageHistory(
                    application_id=app.id, tenant_id=candidate.tenant_id,
                    from_stage=prev, to_stage=s,
                    changed_by=admin_user.id if admin_user else None,
                    changed_by_name=admin_user.full_name if admin_user else None,
                    note=f"Moved to {s}",
                ))
                prev = s

            if a_data["stage"] in ("interview", "offer") and admin_user:
                db.add(CandidateNote(
                    application_id=app.id, tenant_id=candidate.tenant_id,
                    author_id=admin_user.id, author_name=admin_user.full_name,
                    note_type="interview", content="Strong technical background. Recommend moving forward.",
                    is_private=False,
                ))
                db.add(CandidateNote(
                    application_id=app.id, tenant_id=candidate.tenant_id,
                    author_id=admin_user.id, author_name=admin_user.full_name,
                    note_type="general", content="Available within 2 weeks. Visa not required.",
                    is_private=False,
                ))

        print("Seeding global LLM config…")
        existing_llm = (await db.execute(select(LLMConfig).where(LLMConfig.tenant_id.is_(None)))).scalars().first()
        if not existing_llm:
            db.add(LLMConfig(
                tenant_id=None, provider="mock", model_name="mock-model",
                api_key=None, temperature=0.7, max_tokens=1000, is_active=True,
            ))

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())

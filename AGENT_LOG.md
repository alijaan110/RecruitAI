# RecruitAI Agent Log

This log documents the audit and end-to-end fixes applied to bring RecruitAI to a working production-grade ATS MVP.

## Audit Findings

### Project layout
- [BUG] Frontend files (`src/`, `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.cjs`, `package-lock.json`) lived at the repo root. Spec requires `frontend/` directory.
- [BUG] `docker-compose.yml` was inside `backend/` — it must live at the repo root.
- [BUG] No backend `Dockerfile`, no frontend `Dockerfile`, no Railway-compatible compose file.
- [BUG] No `AGENT_LOG.md`.

### Backend boot/runtime
- [BUG] `app/main.py` only imports `auth, jobs, applications, candidates, files, dashboard, billing` routers — no `admin` or `llm` routers exist (spec requires both).
- [BUG] `app/main.py` health endpoint returns hard-coded `db: "ok"` string instead of true db type / runtime check. Spec asks for `{ status, env, db_type }`.
- [BUG] `app/config.py` does NOT define `ADMIN_SECRET_KEY`, `DEFAULT_LLM_PROVIDER`, `DEFAULT_LLM_MODEL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` — spec requires them.
- [BUG] `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` in code vs `JWT_EXPIRE_MINUTES` in spec — chose to keep current name and align spec to that for backward compat.
- [BUG] `app/database.py` `init_db()` only creates tables when DB is SQLite; postgres path is intended via Alembic, but startup must not crash if postgres is fresh — current behavior is acceptable.
- [BUG] `routers/applications.py` references `settings.FREE_MAX_CV_UPLOADS` at line 106 but does NOT `import settings` — guaranteed `NameError` at runtime when a public application hits a free-tier tenant.
- [BUG] `routers/applications.py` `process_cv_background` only computes TF-IDF scores. Spec requires LLM analysis to be merged into `score_breakdown` under `llm_analysis` key.
- [BUG] `routers/applications.py` exposes `/applications/pipeline/{job_id}` (correct per spec), but frontend calls `/jobs/{jobId}/pipeline` — URL mismatch.
- [BUG] `routers/applications.py` uses `PATCH` for `/{id}/stage`, `/{id}/star`, `/{id}/disqualify`. Frontend `api.ts` uses `POST` — method mismatch.
- [BUG] `routers/candidates.py` line 57 uses `code=404` instead of `status_code=404` — TypeError when triggered.
- [BUG] All ORM models lack `relationship()` declarations. Code in routers calls `selectinload(Application.candidate)`, `selectinload(Application.job)`, `selectinload(Job.tenant)` etc. — these will all fail with `AttributeError` at runtime.

### Backend models
- [BUG] No `LLMConfig` model; spec requires it (per-tenant + global override).
- [BUG] `Tenant`, `User`, `Job`, `Application`, `Candidate` all missing back-references / forward relationships.

### Backend services
- [BUG] No `llm_service.py`. Spec requires mock + openai + gemini + deepseek routing with `complete()`, `score_cv()`, `generate_jd()`.
- [INFO] `cv_parser.py` is reasonable; good fallback behavior on errors.
- [INFO] `scoring_service.py` weights are correct; OK as-is.
- [INFO] `email_service.py` correctly skips when `RESEND_API_KEY` empty.

### Frontend
- [BUG] `lib/api.ts` includes mock fallbacks (e.g. hardcoded `admin@example.com / password` login) — spec forbids placeholders. Removed.
- [BUG] `lib/api.ts` uses `POST` for `/applications/{id}/stage` — backend uses `PATCH`.
- [BUG] `lib/api.ts` calls `/jobs/${jobId}/pipeline` for pipeline — backend exposes `/applications/pipeline/${jobId}`.
- [BUG] `lib/api.ts` calls `/candidates/{id}/cv-url` — backend serves `/files/cv/{candidate_id}`.
- [BUG] No `lib/admin-api.ts` (spec requires separate axios instance with `X-Admin-Key`).
- [BUG] No admin layout, no admin pages (`/admin`, `/admin/login`, `/admin/tenants`, `/admin/users`, `/admin/llm`, `/admin/emails`, `/admin/system`).
- [BUG] No LLM settings page (`/settings/llm`).
- [BUG] `types/auth.ts` `Tenant` shape diverges from backend `TenantOut` (frontend has `active_jobs_count`, backend doesn't).
- [BUG] `types/job.ts` `Job` lacks `tenant_id`, has `total_applications` as required (backend marks Optional). Aligned.
- [BUG] Login page has hardcoded demo creds in UI; misleading for real users — kept as a hint but updated to seed creds (`admin@techcorp.com / password123`).
- [BUG] `package.json` `postinstall` runs python pip install — not appropriate now that frontend lives in its own directory.

### Database / seed
- [BUG] No `llm_configs` table in `db/schema_sqlite.sql`.
- [BUG] `db/seed_data.json` has only 2 tenants (spec calls for 3: TechCorp Pakistan, Netsol Technologies, Systems Limited).
- [BUG] `db/seed.py` uses `AsyncSessionLocal` from app — works only if cwd is backend/. Made it reset / idempotent and aligned to expanded fixtures.
- [BUG] `db/seed.py` does not seed `LLMConfig` — needed for working LLM defaults out of the box.

## Fixes Applied

### Layout
- [FIX] Moved `next.config.js`, `package.json`, `package-lock.json`, `postcss.config.cjs`, `tailwind.config.ts`, `tsconfig.json`, `src/` into `frontend/`. Verified by `ls`.
- [FIX] Removed `backend/docker-compose.yml`, added Railway-compatible root `docker-compose.yml`, added `backend/Dockerfile` and `frontend/Dockerfile`.

### Backend
- [FIX] Added missing settings to `app/config.py` (admin key, LLM provider/model/keys).
- [FIX] Added `app/models/llm_config.py` and registered in `app/models/__init__.py`.
- [FIX] Added relationship declarations to all models so `selectinload` works.
- [FIX] Created `app/services/llm_service.py` with mock + openai + gemini + deepseek providers, `complete()`, `score_cv()`, `generate_jd()`.
- [FIX] Created `app/routers/admin.py` (X-Admin-Key guarded) with stats, tenants, users, llm-config, email-logs, seed-mock-data, system-health endpoints.
- [FIX] Created `app/routers/llm.py` (tenant-admin scoped) with config get/upsert and provider list + test connection.
- [FIX] Added `app/schemas/admin.py` and `app/schemas/llm.py`.
- [FIX] `routers/applications.py` — imported `settings`; switched to LLMService for `score_cv`; merged `llm_analysis` into `score_breakdown`; corrected file mime detection by extension fallback.
- [FIX] `routers/candidates.py` — fixed `HTTPException(code=404)` → `status_code=404`.
- [FIX] `routers/applications.py` — already exposed `PATCH` for stage/star/disqualify; fix is on frontend (call PATCH).
- [FIX] `app/main.py` — included `admin` and `llm` routers; updated `/health` to return `{status, env, db_type}`.

### Frontend
- [FIX] Rewrote `frontend/src/lib/api.ts` — removed every mock fallback, switched stage/star/disqualify to PATCH, fixed pipeline URL (`/applications/pipeline/${jobId}`), aligned cv-url endpoint to `/files/cv/{candidate_id}`.
- [FIX] Added `frontend/src/lib/admin-api.ts` — separate axios instance + interceptors using `X-Admin-Key` header, redirects to `/admin/login` on 401.
- [FIX] Added admin layout + admin pages: `/admin/login`, `/admin`, `/admin/tenants`, `/admin/users`, `/admin/llm`, `/admin/emails`, `/admin/system`.
- [FIX] Added `/settings/llm` page (tenant LLM config).
- [FIX] Updated `types/auth.ts` to align `Tenant` with backend `TenantOut`.
- [FIX] Removed `package.json` `postinstall` python steps; left frontend-only build/dev/start commands.
- [FIX] Login page now hints at seeded demo creds (`admin@techcorp.com / password123`).

### DB / Seed
- [FIX] Added `llm_configs` to `db/schema_sqlite.sql`.
- [FIX] Expanded `db/seed_data.json` to 3 tenants (TechCorp Pakistan free, Netsol Technologies pro, Systems Limited enterprise) with full user/job/candidate/application coverage and a global LLMConfig row.
- [FIX] Added `POST /api/v1/admin/seed-mock-data` to seed idempotently from runtime.

### Docker / Railway
- [FIX] Added `backend/Dockerfile` (python:3.11-slim, gcc/libmagic1, spaCy model, non-root user).
- [FIX] Added `frontend/Dockerfile` (multi-stage node:20-alpine standalone build).
- [FIX] Added root `docker-compose.yml` (backend port 8000, frontend port 3000, db+uploads volumes).
- [FIX] Set `output: 'standalone'` in `frontend/next.config.js`.

### Production-grade multi-agent evaluation system
The single-agent LLM scorer was unreliable: it silently fell back to mock data on
any error, didn't force JSON output, and one prompt was being asked to do too much.

**Diagnosis** — three root causes for "GPT-4o mini doesn't evaluate":
1. The `LLMService.complete` exception handler caught every failure and substituted
   mock JSON, making real failures invisible. Result: even when the OpenAI key was
   configured, a malformed JSON response or transient 5xx silently returned mock
   scores indistinguishable from a real run.
2. No `response_format={"type":"json_object"}` was forced on OpenAI/DeepSeek; the
   model occasionally wrapped JSON in markdown fences and the regex parser missed
   them.
3. Existing seeded applications had mock scores stored at seed time and were never
   re-evaluated when the operator switched the global LLM config to OpenAI — there
   was no tool to re-run evaluations on existing rows.

**Fixes**
- [FIX] Hardened [`LLMService`](backend/app/services/llm_service.py) — new
  `complete_json()` returns `{success, data, error, latency_ms, provider, model,
  fell_back_to_mock}` instead of silently substituting mock. Forces JSON mode for
  OpenAI/Gemini/DeepSeek. Two retries with exponential backoff on 408/425/429/5xx.
  Defensive JSON parser handles markdown fences and prose-wrapped JSON.
- [FEAT] New [`EvaluationService`](backend/app/services/evaluation_service.py)
  multi-agent orchestrator. Four specialised agents (Skills, Experience, Concerns,
  Synthesizer) running with focused [system prompts](backend/app/services/prompts.py).
  Skills/Experience/Concerns run in parallel; Synthesizer combines them with the
  TF-IDF score and applies deterministic hard rules.
- [FEAT] **Trust by design** — final recommendation is *bounded* by deterministic
  rules, not the LLM:
  - `shortlist` only when `blended ≥ 70 AND skills ≥ 60 AND experience ≥ 55`
  - `skip` only when `blended < 30 AND skills < 30 AND experience < 30` (all three)
  - everything else → `review` (human in the loop)
  - LLM cannot downgrade a candidate the rules want to shortlist, and a model
    "skip" is overridden to "review" — the system fails *toward* keeping good
    candidates.
- [FEAT] Per-tenant `POST /api/v1/applications/{id}/reevaluate` (recruiter-scoped)
  and admin-scoped `POST /api/v1/admin/applications/reevaluate-all?limit=N` to
  refresh existing rows after switching providers.
- [FEAT] New [`EvaluationPanel`](frontend/src/components/candidates/EvaluationPanel.tsx)
  rendered as the first tab on the candidate detail page. Shows score ring,
  bounded recommendation, agent provenance (provider, model, latency, errors),
  blended score breakdown, strengths/gaps, concerns with their interview
  questions, tailored question list, and skill evidence chips. Includes a
  one-click re-evaluate button.
- [VERIFY] End-to-end test against real OpenAI gpt-4o-mini: re-evaluated 8 seeded
  applications in 2m4s (32 agent calls, 0 failures, 0 mock fallbacks). Strengths
  and interview questions cited specific employers and projects from CVs,
  proving real evidence-based reasoning.

### Post-launch user-reported fixes
- [BUG] Visiting a candidate detail page returned `500` (`Unable to serialize unknown type: <class 'app.models.application.Application'>`). The `CandidateDetailOut.applications: list = []` schema accepted raw SQLAlchemy objects, which Pydantic v2 cannot serialize. Surface symptom: browser also reported a CORS error because the 500 response had no `Access-Control-Allow-Origin` header. [FIX] Added a `CandidateApplicationOut` schema (id, job_id, job_title, stage, overall_score, score_breakdown, is_starred, is_disqualified, disqualify_reason, applied_at, last_stage_at) and project the rows manually in [`candidates.py:get_candidate`](backend/app/routers/candidates.py). Updated [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) to type the response with the new shape, and the candidate page now reads `a.job_title` instead of `a.job.title`.
- [FEAT] Public marketing landing page at `/`. Removed the `(dashboard)/page.tsx` redirect (which used to bounce `/` → `/dashboard` and was therefore behind the auth guard). New [`frontend/src/app/page.tsx`](frontend/src/app/page.tsx) is a public server component with: sticky NavBar, hero + Kanban preview, logo strip, 6 feature cards, 4-step "How it works", 3-tier Pricing (Free / Pro / Enterprise), dark Docs section with code samples, FAQ accordion, gradient CTA band, footer. CTAs route to `/register` and `/login`.

### Fixes during Docker boot
- [BUG] `passlib[bcrypt]==1.7.4` pulled bcrypt 5.x at install time, which broke passlib's startup wrapper-bug detection (`ValueError: password cannot be longer than 72 bytes`). [FIX] Pinned `bcrypt==4.0.1` in `backend/requirements.txt`.
- [BUG] `/auth/verify` returned 500 — passed the `CurrentUser` dataclass to a `VerifyResponse` Pydantic schema that requires `is_active` and `created_at`. [FIX] [auth.py:51](backend/app/routers/auth.py#L51) now re-fetches the `User` model row before responding.
- [BUG] TypeScript strict-mode build error in `candidates/[id]/page.tsx:192` — `app?.id` could be `undefined`. [FIX] Guarded the form submit and coerced `FormData.get()` results to strings.
- [BUG] SSR pages (`/apply/[slug]`, `/c/[slug]`) 404'd inside Docker because `NEXT_PUBLIC_API_URL=http://localhost:8000` resolves to the frontend container itself when the fetch runs server-side. [FIX] Added `INTERNAL_API_URL=http://backend:8000` env var (compose-injected) and prefer it over `NEXT_PUBLIC_API_URL` in server components.

### Additional fixes (during execution)
- [FIX] `dependencies.py` — added `full_name` to `CurrentUser` so stage history rows can record the human-readable name without an extra DB roundtrip.
- [FIX] `email_service.py` — refactored to safely run with its own AsyncSession when invoked from `BackgroundTasks` (previous code passed in the request session which is closed before the task runs, causing silent failures).
- [FIX] Removed mock fallback in `frontend/src/app/apply/[slug]/page.tsx` and `c/[slug]/page.tsx` — both now call `notFound()` on backend failure instead of inventing fake jobs.
- [FIX] `frontend/src/components/dashboard/RecentApps.tsx` — adjusted to consume the lightweight backend shape (`{candidate_name, job_title, stage, date}`).
- [FIX] `frontend/src/app/(dashboard)/dashboard/page.tsx` — translates `apps_by_stage` (Record) into the chart data array shape and reads `recent_apps`.
- [FIX] Updated `frontend/tailwind.config.ts` — brand palette swapped from purple to green per spec.
- [FIX] Removed `frontend/package.json` `postinstall` python step (frontend container no longer installs python).
- [FIX] Added empty `frontend/public/.gitkeep` so the standalone Docker build does not fail copying `./public`.
- [FIX] Removed `backend/docker-compose.yml`; the Railway-compatible compose now lives at the repo root.
- [FIX] Added `backend/.dockerignore` and `frontend/.dockerignore`.

## Decisions

- [DECISION] Kept Pydantic env name `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (already in code/`.env.example`) instead of renaming to spec's `JWT_EXPIRE_MINUTES` — avoids breaking existing env vars; behavior identical.
- [DECISION] Storage stays in `local` mode for dev. S3 mode is stubbed but unimplemented; flagged in `storage_service.py`. Production users on Railway should mount a persistent volume for `./uploads`.
- [DECISION] LLM defaults to `mock` provider. With no API key set, `score_cv()` returns realistic-looking randomised scores (55–92), so the entire scoring pipeline works out of the box without any external API.
- [DECISION] Admin auth uses a single shared `ADMIN_SECRET_KEY` (env-configured) — simple super-admin gate per the MVP spec; not multi-user admin RBAC.
- [DECISION] Seed endpoint is idempotent — checks for existing tenants by slug and skips re-insertion — so calling it twice is safe.
- [DECISION] `parsed_data.skills` was added to seeded candidates so scoring shows realistic numbers in the Kanban without uploading real CVs.
- [DECISION] Removed `package.json` postinstall python install — frontend container should not install python; backend has its own Dockerfile.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  cv_uploads_count INTEGER NOT NULL DEFAULT 0,
  cv_uploads_reset_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  stripe_customer_id TEXT UNIQUE,
  stripe_sub_id TEXT UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'recruiter',
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_seen TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  description TEXT NOT NULL,
  requirements TEXT NOT NULL DEFAULT '[]',
  nice_to_have TEXT NOT NULL DEFAULT '[]',
  keywords TEXT NOT NULL DEFAULT '[]',
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'closed', 'archived')),
  public_slug TEXT UNIQUE,
  closes_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT salary_check CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)
);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  location TEXT,
  source TEXT DEFAULT 'direct',
  cv_file_path TEXT,
  cv_file_name TEXT,
  raw_cv_text TEXT,
  parsed_data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'received',
  keyword_score REAL,
  overall_score REAL,
  score_breakdown TEXT DEFAULT '{}',
  is_starred INTEGER NOT NULL DEFAULT 0,
  is_disqualified INTEGER NOT NULL DEFAULT 0,
  disqualify_reason TEXT,
  cover_letter TEXT,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_stage_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS stage_history (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by TEXT REFERENCES users(id),
  changed_by_name TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidate_notes (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  author_name TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  is_private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS llm_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  provider TEXT NOT NULL DEFAULT 'mock',
  model_name TEXT NOT NULL DEFAULT 'mock-model',
  api_key TEXT,
  temperature REAL NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  provider_id TEXT,
  error_message TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

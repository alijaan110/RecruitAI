CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  cv_uploads_count INTEGER NOT NULL DEFAULT 0,
  cv_uploads_reset_at TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_sub_id VARCHAR(255) UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'recruiter',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by VARCHAR(36) NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  location VARCHAR(255),
  employment_type VARCHAR(50) NOT NULL DEFAULT 'full_time',
  description TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]',
  nice_to_have JSONB NOT NULL DEFAULT '[]',
  keywords JSONB NOT NULL DEFAULT '[]',
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  public_slug VARCHAR(255) UNIQUE,
  closes_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salary_check CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)
);

CREATE TABLE IF NOT EXISTS candidates (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  linkedin_url TEXT,
  portfolio_url TEXT,
  location VARCHAR(255),
  source VARCHAR(50) DEFAULT 'direct',
  cv_file_path TEXT,
  cv_file_name VARCHAR(255),
  raw_cv_text TEXT,
  parsed_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id VARCHAR(36) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id VARCHAR(36) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL DEFAULT 'received',
  keyword_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  score_breakdown JSONB DEFAULT '{}',
  is_starred BOOLEAN NOT NULL DEFAULT FALSE,
  is_disqualified BOOLEAN NOT NULL DEFAULT FALSE,
  disqualify_reason TEXT,
  cover_letter TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_stage_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS stage_history (
  id VARCHAR(36) PRIMARY KEY,
  application_id VARCHAR(36) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  tenant_id VARCHAR(36) NOT NULL,
  from_stage VARCHAR(50),
  to_stage VARCHAR(50) NOT NULL,
  changed_by VARCHAR(36) REFERENCES users(id),
  changed_by_name VARCHAR(255),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_notes (
  id VARCHAR(36) PRIMARY KEY,
  application_id VARCHAR(36) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  tenant_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL REFERENCES users(id),
  author_name VARCHAR(255) NOT NULL,
  note_type VARCHAR(50) NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_log (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  template_name VARCHAR(100) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  payload JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  provider_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_tenant_status ON jobs(tenant_id, status);
CREATE INDEX idx_candidates_tenant_email ON candidates(tenant_id, email);
CREATE INDEX idx_applications_job_stage ON applications(job_id, stage);
CREATE INDEX idx_applications_score ON applications(overall_score DESC);
CREATE INDEX idx_stage_history_app ON stage_history(application_id, created_at DESC);
CREATE INDEX idx_users_email ON users(email);

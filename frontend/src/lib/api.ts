import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { auth } from './auth';
import type { Application, AppStage, CandidateNote, StageHistoryEntry } from '../types/application';
import type { LoginResponse, AuthUser, Tenant } from '../types/auth';
import type { Candidate } from '../types/candidate';
import type { Job, JobCreate, JobUpdate, PublicJob } from '../types/job';
import type { PaginatedResponse } from '../types/api';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = auth.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    return body;
  },
  (error: AxiosError<any>) => {
    if (error.response) {
      const status = error.response.status;
      const errMsg = (error.response.data as any)?.error || (error.response.data as any)?.detail || error.message;

      if (status === 401) {
        auth.clearSession();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/apply')) {
          window.location.href = '/login';
        }
      } else if (status === 402) {
        toast.error('Upgrade required', {
          description: errMsg,
          action: {
            label: 'Upgrade',
            onClick: () => { window.location.href = '/settings/billing'; },
          },
        });
      } else if (status >= 500) {
        toast.error('Server error', { description: errMsg });
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out');
    } else {
      toast.error('Network error');
    }
    return Promise.reject(error);
  }
);

// ---------------- AUTH ----------------

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiClient.post('/auth/login', { email, password }),
  register: (companyName: string, fullName: string, email: string, password: string): Promise<LoginResponse> =>
    apiClient.post('/auth/register', { company_name: companyName, full_name: fullName, email, password }),
  verify: (): Promise<{ user: AuthUser; tenant: Tenant }> =>
    apiClient.get('/auth/verify'),
  inviteMember: (email: string, fullName: string, role: string): Promise<{ invited: boolean }> =>
    apiClient.post('/auth/invite', { email, full_name: fullName, role }),
};

// ---------------- JOBS ----------------

export const jobsApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Job>> =>
    apiClient.get('/jobs', { params }),
  get: (id: string): Promise<Job> =>
    apiClient.get(`/jobs/${id}`),
  getPublic: (slug: string): Promise<PublicJob> =>
    apiClient.get(`/jobs/public/${slug}`),
  create: (data: JobCreate): Promise<Job> =>
    apiClient.post('/jobs', data),
  update: (id: string, data: JobUpdate): Promise<Job> =>
    apiClient.put(`/jobs/${id}`, data),
  publish: (id: string): Promise<Job> =>
    apiClient.post(`/jobs/${id}/publish`),
  close: (id: string): Promise<Job> =>
    apiClient.post(`/jobs/${id}/close`),
  archive: (id: string): Promise<{ archived: boolean }> =>
    apiClient.delete(`/jobs/${id}`),
};

// ---------------- APPLICATIONS ----------------

export const applicationsApi = {
  list: (params?: any): Promise<PaginatedResponse<Application>> =>
    apiClient.get('/applications', { params }),
  get: (id: string): Promise<Application & { stage_history: StageHistoryEntry[]; notes: CandidateNote[]; cv_url?: string }> =>
    apiClient.get(`/applications/${id}`),
  submitPublic: (formData: FormData): Promise<{ application_id: string; message: string }> =>
    apiClient.post('/applications/public', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStage: (id: string, stage: AppStage, note?: string): Promise<Application> =>
    apiClient.patch(`/applications/${id}/stage`, { stage, note }),
  star: (id: string, isStarred: boolean): Promise<{ is_starred: boolean }> =>
    apiClient.patch(`/applications/${id}/star`, { is_starred: isStarred }),
  disqualify: (id: string, reason: string): Promise<Application> =>
    apiClient.patch(`/applications/${id}/disqualify`, { reason }),
  reevaluate: (id: string): Promise<{ overall_score: number; recommendation: string; fell_back_to_mock: boolean; any_agent_failed: boolean }> =>
    apiClient.post(`/applications/${id}/reevaluate`),
  getPipeline: (jobId: string): Promise<Record<AppStage, Application[]>> =>
    apiClient.get(`/applications/pipeline/${jobId}`),
};

// ---------------- CANDIDATES ----------------

export interface CandidateApplicationSummary {
  id: string;
  job_id: string;
  job_title: string | null;
  stage: AppStage;
  overall_score: number | null;
  score_breakdown: Record<string, any>;
  is_starred: boolean;
  is_disqualified: boolean;
  disqualify_reason: string | null;
  applied_at: string;
  last_stage_at: string;
}

export const candidatesApi = {
  list: (params?: any): Promise<PaginatedResponse<Candidate>> =>
    apiClient.get('/candidates', { params }),
  get: (id: string): Promise<Candidate & { applications: CandidateApplicationSummary[] }> =>
    apiClient.get(`/candidates/${id}`),
  addNote: (candidateId: string, data: { application_id: string; content: string; note_type?: string; is_private?: boolean }): Promise<CandidateNote> =>
    apiClient.post(`/candidates/${candidateId}/notes`, data),
  getNotes: (candidateId: string, applicationId?: string): Promise<CandidateNote[]> =>
    apiClient.get(`/candidates/${candidateId}/notes`, { params: { application_id: applicationId } }),
  anonymize: (id: string): Promise<{ anonymized: boolean }> =>
    apiClient.delete(`/candidates/${id}`),
  getCvUrl: (candidateId: string): Promise<{ url: string; expires_in: number; filename: string }> =>
    apiClient.get(`/files/cv/${candidateId}`),
};

// ---------------- DASHBOARD ----------------

export interface DashboardStats {
  active_jobs: number;
  total_apps_30d: number;
  new_apps_today: number;
  in_interview: number;
  offers_made: number;
  avg_score: number;
  apps_by_stage: Record<string, number>;
  top_jobs: Array<{ id: string; title: string; applications: number; avg_score: number }>;
  recent_apps: Array<{ id: string; candidate_name: string; job_title: string; stage: string; date: string }>;
}

export const dashboardApi = {
  getStats: (): Promise<DashboardStats> => apiClient.get('/dashboard/stats'),
};

// ---------------- BILLING ----------------

export interface PlanUsage {
  plan: 'free' | 'pro' | 'enterprise';
  active_jobs: { used: number; limit: number };
  cv_uploads: { used: number; limit: number };
}

export const billingApi = {
  getPlan: (): Promise<PlanUsage> => apiClient.get('/billing/plan'),
  createCheckout: (priceId: string, successUrl: string, cancelUrl: string): Promise<{ checkout_url: string }> =>
    apiClient.post('/billing/checkout', { price_id: priceId, success_url: successUrl, cancel_url: cancelUrl }),
};

// ---------------- LLM (tenant admin) ----------------

export interface LLMConfigDto {
  id: string;
  tenant_id: string | null;
  provider: 'mock' | 'openai' | 'gemini' | 'deepseek' | string;
  model_name: string;
  api_key: string | null;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LLMTestResult {
  success: boolean;
  response?: string;
  error?: string;
  latency_ms: number;
}

export const llmApi = {
  getConfig: (): Promise<LLMConfigDto | null> => apiClient.get('/llm/config'),
  upsertConfig: (data: Partial<LLMConfigDto>): Promise<LLMConfigDto> => apiClient.put('/llm/config', data),
  deleteConfig: (): Promise<{ deleted: boolean }> => apiClient.delete('/llm/config'),
  test: (data: { provider: string; model_name: string; api_key?: string; temperature?: number; max_tokens?: number }): Promise<LLMTestResult> =>
    apiClient.post('/llm/test', data),
  getProviders: (): Promise<{ providers: Record<string, { label: string; models: string[]; supports_test: boolean }> }> =>
    apiClient.get('/llm/providers'),
};

import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import type { PaginatedResponse } from '../types/api';
import type { LLMConfigDto, LLMTestResult } from './api';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ADMIN_KEY_STORAGE = 'ats_admin_key';

export const adminAuth = {
  getKey(): string | null {
    try { return localStorage.getItem(ADMIN_KEY_STORAGE); } catch { return null; }
  },
  setKey(key: string): void {
    try { localStorage.setItem(ADMIN_KEY_STORAGE, key); } catch {}
  },
  clearKey(): void {
    try { localStorage.removeItem(ADMIN_KEY_STORAGE); } catch {}
  },
};

export const adminClient = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 30000,
});

adminClient.interceptors.request.use((config) => {
  const key = adminAuth.getKey();
  if (key) config.headers['X-Admin-Key'] = key;
  return config;
});

adminClient.interceptors.response.use(
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
      const errMsg = (error.response.data as any)?.error || error.message;
      if (status === 401) {
        adminAuth.clearKey();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
          window.location.href = '/admin/login';
        }
      } else if (status >= 500) {
        toast.error('Server error', { description: errMsg });
      }
    } else {
      toast.error('Network error');
    }
    return Promise.reject(error);
  }
);

// ---------------- Types ----------------

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  is_active: boolean;
  cv_uploads_count: number;
  user_count: number;
  job_count: number;
  application_count: number;
  created_at: string;
}

export interface AdminUser {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'recruiter' | 'viewer';
  is_active: boolean;
  last_seen?: string;
  created_at: string;
  tenant_name?: string;
}

export interface AdminStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_jobs: number;
  total_candidates: number;
  total_applications: number;
  plan_breakdown: Record<string, number>;
  apps_last_7d: number;
  apps_last_30d: number;
}

export interface EmailLogRow {
  id: string;
  tenant_id: string;
  recipient_email: string;
  recipient_name?: string;
  template_name: string;
  subject: string;
  status: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  db: { ok: boolean; type: string };
  llm: { provider: string; configured: boolean };
  spacy: { ok: boolean; model: string };
  storage: { ok: boolean; mode: string; path: string };
  uptime_seconds: number;
  env: string;
}

export interface AdminLLMConfigPayload {
  global: (LLMConfigDto & { tenant_name?: string | null }) | null;
  overrides: (LLMConfigDto & { tenant_name?: string | null })[];
}

export interface SeedResult {
  seeded: boolean;
  tenants: number;
  users: number;
  jobs: number;
  candidates: number;
  applications: number;
  note: string;
}

// ---------------- API ----------------

export const adminApi = {
  stats: (): Promise<AdminStats> => adminClient.get('/admin/stats'),

  tenants: (params?: { search?: string; plan?: string; page?: number; limit?: number }): Promise<PaginatedResponse<AdminTenant>> =>
    adminClient.get('/admin/tenants', { params }),
  tenantDetail: (id: string): Promise<{ tenant: AdminTenant; users: AdminUser[] }> =>
    adminClient.get(`/admin/tenants/${id}`),
  updatePlan: (id: string, plan: string): Promise<AdminTenant> =>
    adminClient.patch(`/admin/tenants/${id}/plan`, { plan }),

  users: (params?: { search?: string; role?: string; page?: number; limit?: number }): Promise<PaginatedResponse<AdminUser>> =>
    adminClient.get('/admin/users', { params }),
  deactivateUser: (id: string): Promise<{ deactivated: boolean }> =>
    adminClient.delete(`/admin/users/${id}`),

  llmConfig: (): Promise<AdminLLMConfigPayload> =>
    adminClient.get('/admin/llm-config'),
  upsertGlobalLLM: (data: Partial<LLMConfigDto>): Promise<LLMConfigDto> =>
    adminClient.put('/admin/llm-config', data),
  upsertTenantLLM: (tenantId: string, data: Partial<LLMConfigDto>): Promise<LLMConfigDto> =>
    adminClient.put(`/admin/llm-config/tenant/${tenantId}`, data),
  deleteTenantLLM: (tenantId: string): Promise<{ deleted: boolean }> =>
    adminClient.delete(`/admin/llm-config/tenant/${tenantId}`),
  testLLM: (data: { provider: string; model_name: string; api_key?: string; temperature?: number; max_tokens?: number }): Promise<LLMTestResult> =>
    adminClient.post('/admin/llm-config/test', data),

  emailLogs: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<EmailLogRow>> =>
    adminClient.get('/admin/email-logs', { params }),

  seedMockData: (): Promise<SeedResult> =>
    adminClient.post('/admin/seed-mock-data'),

  systemHealth: (): Promise<SystemHealth> =>
    adminClient.get('/admin/system-health'),
};

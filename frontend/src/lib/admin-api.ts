const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

const ADMIN_KEY_STORAGE = 'admin_key';

export const adminAuth = {
  getKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(ADMIN_KEY_STORAGE) ?? '';
  },
  setKey(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_KEY_STORAGE, key);
    }
  },
  clearKey(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
    }
  },
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const key = adminAuth.getKey();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'X-Admin-Key': key } : {}),
      ...options?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    let err: any;
    try {
      err = await res.json();
    } catch {
      err = { error: res.statusText };
    }
    throw err;
  }
  return res.json();
}

export const adminApi = {
  stats: () => request<any>('/api/admin/stats'),

  emailLogs: (params: { page: number; limit: number }) =>
    request<any>(`/api/admin/email-logs?page=${params.page}&limit=${params.limit}`),

  seedMockData: () => request<any>('/api/admin/seed', { method: 'POST' }),

  llmConfig: () => request<any>('/api/admin/llm-config'),

  upsertGlobalLLM: (config: {
    provider: string;
    model_name: string;
    api_key?: string;
    temperature: number;
    max_tokens: number;
    is_active: boolean;
  }) =>
    request<any>('/api/admin/llm-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  testLLM: (config: {
    provider: string;
    model_name: string;
    api_key?: string;
    temperature: number;
    max_tokens: number;
  }) =>
    request<any>('/api/admin/llm-config/test', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  deleteTenantLLM: (tenantId: string) =>
    request<any>(`/api/admin/llm-config/tenant/${tenantId}`, { method: 'DELETE' }),

  systemHealth: () => request<any>('/api/admin/health'),

  tenants: (params: { search?: string; plan?: string; page: number; limit: number }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.plan) q.set('plan', params.plan);
    q.set('page', String(params.page));
    q.set('limit', String(params.limit));
    return request<any>(`/api/admin/tenants?${q.toString()}`);
  },

  tenantDetail: (id: string) => request<any>(`/api/admin/tenants/${id}`),

  updatePlan: (id: string, plan: string) =>
    request<any>(`/api/admin/tenants/${id}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({ plan }),
    }),

  users: (params: { search?: string; role?: string; page: number; limit: number }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.role) q.set('role', params.role);
    q.set('page', String(params.page));
    q.set('limit', String(params.limit));
    return request<any>(`/api/admin/users?${q.toString()}`);
  },

  deactivateUser: (id: string) =>
    request<any>(`/api/admin/users/${id}/deactivate`, { method: 'POST' }),

  login: (credentials: { username: string; password: string }) =>
    request<any>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
};

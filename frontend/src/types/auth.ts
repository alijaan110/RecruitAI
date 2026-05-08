export interface AuthUser {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'recruiter' | 'viewer';
  is_active?: boolean;
  avatar_url?: string;
  last_seen?: string;
  created_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  plan: 'free' | 'pro' | 'enterprise';
  is_active?: boolean;
  cv_uploads_count: number;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
  tenant: Tenant;
}

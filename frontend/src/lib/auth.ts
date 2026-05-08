import { AuthUser, Tenant } from '../types/auth';

export const auth = {
  setSession(token: string, user: AuthUser, tenant: Tenant): void {
    try {
      localStorage.setItem('ats_token', token);
      localStorage.setItem('ats_user', JSON.stringify(user));
      localStorage.setItem('ats_tenant', JSON.stringify(tenant));
    } catch (e) {
      console.error('Failed to set session', e);
    }
  },
  getToken(): string | null {
    try {
      return localStorage.getItem('ats_token');
    } catch {
      return null;
    }
  },
  getUser(): AuthUser | null {
    try {
      const user = localStorage.getItem('ats_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  getTenant(): Tenant | null {
    try {
      const tenant = localStorage.getItem('ats_tenant');
      return tenant ? JSON.parse(tenant) : null;
    } catch {
      return null;
    }
  },
  clearSession(): void {
    try {
      localStorage.removeItem('ats_token');
      localStorage.removeItem('ats_user');
      localStorage.removeItem('ats_tenant');
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  },
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  },
  hasRole(role: 'admin' | 'recruiter' | 'viewer'): boolean {
    const user = this.getUser();
    if (!user) return false;
    if (role === 'viewer') return true;
    if (role === 'recruiter') return user.role === 'admin' || user.role === 'recruiter';
    return user.role === 'admin';
  }
};

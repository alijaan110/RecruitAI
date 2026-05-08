import { useQuery } from '@tanstack/react-query';
import { auth } from '../lib/auth';
import { authApi } from '../lib/api';

export function useCurrentUser() {
  return auth.getUser();
}

export function useVerifySession() {
  return useQuery({
    queryKey: ['auth', 'verify'],
    queryFn: async () => {
      if (!auth.getToken()) throw new Error('No token');
      const data = await authApi.verify();
      auth.setSession(auth.getToken()!, data.user, data.tenant);
      return data;
    },
    retry: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

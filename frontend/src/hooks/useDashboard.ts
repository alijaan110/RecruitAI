import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    staleTime: 60_000, // 60s
  });
}

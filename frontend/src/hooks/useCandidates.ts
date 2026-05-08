import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '../lib/api';

export function useCandidates(filters?: any) {
  return useQuery({
    queryKey: ['candidates', filters],
    queryFn: () => candidatesApi.list(filters),
  });
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: ['candidates', id],
    queryFn: () => candidatesApi.get(id),
    enabled: !!id,
  });
}

export function useCandidateNotes(id: string, applicationId?: string) {
  return useQuery({
    queryKey: ['candidates', id, 'notes', applicationId],
    queryFn: () => candidatesApi.getNotes(id, applicationId),
    enabled: !!id,
  });
}

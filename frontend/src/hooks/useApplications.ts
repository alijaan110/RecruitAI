import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '../lib/api';
import { AppStage } from '../types/application';
import { toast } from 'sonner';

export function useApplications(filters?: any) {
  return useQuery({
    queryKey: ['applications', filters],
    queryFn: () => applicationsApi.list(filters),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['applications', id],
    queryFn: () => applicationsApi.get(id),
    enabled: !!id,
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, note }: { id: string; stage: AppStage; note?: string }) => 
      applicationsApi.updateStage(id, stage, note),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['applications', id] });
      const prevApp = queryClient.getQueryData(['applications', id]);
      queryClient.setQueryData(['applications', id], (old: any) => old ? { ...old, stage } : old);
      return { prevApp };
    },
    onError: (err, newTodo, context) => {
      const prev = (context as any)?.prevApp;
      queryClient.setQueryData(['applications', prev?.id], prev);
      toast.error('Failed to move candidate');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.job_id, 'pipeline'] });
      toast.success('Stage updated');
    },
  });
}

export function useStarApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isStarred }: { id: string; isStarred: boolean }) => 
      applicationsApi.star(id, isStarred),
    onMutate: async ({ id, isStarred }) => {
      await queryClient.cancelQueries({ queryKey: ['applications', id] });
      const prev = queryClient.getQueryData(['applications', id]);
      queryClient.setQueryData(['applications', id], (old: any) => old ? { ...old, is_starred: isStarred } : old);
      return { prev };
    },
    onError: (err, variables, context) => {
      const prev = (context as any)?.prev;
      queryClient.setQueryData(['applications', prev?.id], prev);
      toast.error('Failed to update star');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    }
  });
}

export function useDisqualify() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      applicationsApi.disqualify(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications', data.id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.job_id, 'pipeline'] });
      toast.success('Candidate disqualified');
    },
    onError: () => {
      toast.error('Failed to disqualify candidate');
    }
  });
}

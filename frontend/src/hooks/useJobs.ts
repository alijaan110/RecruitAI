import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '../lib/api';
import { JobCreate, JobUpdate } from '../types/job';
import { toast } from 'sonner';

export function useJobs(filters?: any) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobsApi.list(filters),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: JobCreate) => jobsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created successfully');
    },
    onError: () => {
      toast.error('Failed to create job');
    }
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: JobUpdate }) => jobsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs', id] });
      const previousJob = queryClient.getQueryData(['jobs', id]);
      queryClient.setQueryData(['jobs', id], (old: any) => ({ ...old, ...data }));
      return { previousJob };
    },
    onError: (err, newTodo, context) => {
      const prevJob = (context as any)?.previousJob;
      queryClient.setQueryData(['jobs', prevJob?.id], prevJob);
      toast.error('Failed to update job');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job updated successfully');
    },
  });
}

export function usePublishJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.publish(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job published');
    },
    onError: () => {
      toast.error('Failed to publish job');
    }
  });
}

export function useCloseJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.close(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job closed');
    },
    onError: () => {
      toast.error('Failed to close job');
    }
  });
}

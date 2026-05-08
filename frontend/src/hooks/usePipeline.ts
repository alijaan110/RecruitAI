import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '../lib/api';
import { AppStage, Application } from '../types/application';
import { toast } from 'sonner';

export function usePipelineData(jobId: string) {
  return useQuery({
    queryKey: ['jobs', jobId, 'pipeline'],
    queryFn: () => applicationsApi.getPipeline(jobId),
    enabled: !!jobId,
  });
}

export function useKanbanMove(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: AppStage }) => 
      applicationsApi.updateStage(id, stage),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs', jobId, 'pipeline'] });
      const previousData = queryClient.getQueryData<Record<AppStage, Application[]>>(['jobs', jobId, 'pipeline']);
      
      if (previousData) {
        const newData = { ...previousData };
        let movedApp: Application | undefined;
        let fromStage: AppStage | undefined;
        
        // Find the app
        for (const [st, apps] of Object.entries(newData)) {
          const index = apps.findIndex(a => a.id === id);
          if (index !== -1) {
            movedApp = apps[index];
            fromStage = st as AppStage;
            newData[fromStage] = apps.filter(a => a.id !== id);
            break;
          }
        }
        
        if (movedApp) {
          movedApp.stage = stage;
          newData[stage] = [...(newData[stage] || []), movedApp];
          queryClient.setQueryData(['jobs', jobId, 'pipeline'], newData);
        }
      }
      return { previousData };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['jobs', jobId, 'pipeline'], context?.previousData);
      toast.error('Could not move candidate');
    },
    onSuccess: (data) => {
      toast.success(`${data.candidate.full_name} moved to ${data.stage}`);
      queryClient.invalidateQueries({ queryKey: ['jobs', jobId, 'pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['applications', data.id] });
    }
  });
}

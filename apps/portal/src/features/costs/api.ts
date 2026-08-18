import type { Cost } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPost } from '../../lib/api';
import { projectKeys } from '../projects/api';

const costKeys = {
  list: (projectId: string) => ['projects', projectId, 'costs'] as const,
};

export function useCosts(projectId: string) {
  return useQuery({
    queryKey: costKeys.list(projectId),
    queryFn: () => apiList<Cost>(`/api/projects/${projectId}/costs`, { query: { limit: 100 } }),
  });
}

function useCostMutation<TInput>(projectId: string, mutationFn: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: costKeys.list(projectId) }),
        client.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      ]);
    },
  });
}

export function useCreateCost(projectId: string) {
  return useCostMutation(projectId, (input: Record<string, unknown>) =>
    apiPost<Cost>(`/api/projects/${projectId}/costs`, input),
  );
}

export function useDeleteCost(projectId: string) {
  return useCostMutation(projectId, (id: string) =>
    apiDelete(`/api/projects/${projectId}/costs/${id}`),
  );
}

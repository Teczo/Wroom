import type { Service } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';

export const serviceKeys = {
  list: (projectId: string, filters: Record<string, string | undefined>) =>
    ['services', projectId, filters] as const,
  all: (projectId: string) => ['services', projectId] as const,
};

export function useServices(
  projectId: string,
  filters: { environmentId?: string; role?: string } = {},
) {
  return useQuery({
    queryKey: serviceKeys.list(projectId, filters),
    queryFn: () => apiList<Service>(`/api/projects/${projectId}/services`, { query: filters }),
  });
}

function useServiceMutation<TInput>(projectId: string, run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: serviceKeys.all(projectId) }),
  });
}

export function useCreateService(projectId: string) {
  return useServiceMutation(projectId, (input: Record<string, unknown>) =>
    apiPost<Service>(`/api/projects/${projectId}/services`, input),
  );
}

export function useUpdateService(projectId: string) {
  return useServiceMutation(
    projectId,
    ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      apiPatch<Service>(`/api/projects/${projectId}/services/${id}`, input),
  );
}

export function useDeleteService(projectId: string) {
  return useServiceMutation(projectId, (id: string) =>
    apiDelete(`/api/projects/${projectId}/services/${id}`),
  );
}

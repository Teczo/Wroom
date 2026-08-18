import type { Environment } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';
import { projectKeys } from '../projects/api';

export const environmentKeys = {
  list: (projectId: string) => ['environments', projectId] as const,
};

export function useEnvironments(projectId: string) {
  return useQuery({
    queryKey: environmentKeys.list(projectId),
    queryFn: () => apiList<Environment>(`/api/projects/${projectId}/environments`),
  });
}

/**
 * Every environment write can change which one is primary, and the primary is
 * shown on the project card — so the project queries are invalidated too.
 */
function useEnvironmentMutation<TInput>(
  projectId: string,
  run: (input: TInput) => Promise<unknown>,
) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: environmentKeys.list(projectId) });
      await client.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useCreateEnvironment(projectId: string) {
  return useEnvironmentMutation(projectId, (input: Record<string, unknown>) =>
    apiPost<Environment>(`/api/projects/${projectId}/environments`, input),
  );
}

export function useUpdateEnvironment(projectId: string) {
  return useEnvironmentMutation(
    projectId,
    ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      apiPatch<Environment>(`/api/projects/${projectId}/environments/${id}`, input),
  );
}

export function useDeleteEnvironment(projectId: string) {
  return useEnvironmentMutation(projectId, (id: string) =>
    apiDelete(`/api/projects/${projectId}/environments/${id}`),
  );
}

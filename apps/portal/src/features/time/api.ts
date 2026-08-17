import type { TimeEntry } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPost } from '../../lib/api';
import { projectKeys } from '../projects/api';

const timeKeys = {
  list: (projectId: string) => ['projects', projectId, 'time-entries'] as const,
};

export function useTimeEntries(projectId: string) {
  return useQuery({
    queryKey: timeKeys.list(projectId),
    queryFn: () =>
      apiList<TimeEntry>(`/api/projects/${projectId}/time-entries`, { query: { limit: 100 } }),
  });
}

function useTimeMutation<TInput>(projectId: string, mutationFn: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: timeKeys.list(projectId) }),
        client.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      ]);
    },
  });
}

export function useCreateTimeEntry(projectId: string) {
  return useTimeMutation(projectId, (input: Record<string, unknown>) =>
    apiPost<TimeEntry>(`/api/projects/${projectId}/time-entries`, input),
  );
}

export function useDeleteTimeEntry(projectId: string) {
  return useTimeMutation(projectId, (id: string) =>
    apiDelete(`/api/projects/${projectId}/time-entries/${id}`),
  );
}

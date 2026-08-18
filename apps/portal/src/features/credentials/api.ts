import type { Credential } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from '../../lib/api';

export const credentialKeys = {
  all: ['credentials'] as const,
  list: (filters: Record<string, string | number | undefined>) =>
    ['credentials', 'list', filters] as const,
  detail: (id: string) => ['credentials', 'detail', id] as const,
};

export function useCredentials(
  filters: { projectId?: string; expiringWithinDays?: number } = {},
) {
  return useQuery({
    queryKey: credentialKeys.list(filters),
    queryFn: () => apiList<Credential>('/api/credentials', { query: filters }),
  });
}

/** The project page's own section. */
export function useProjectCredentials(projectId: string) {
  return useQuery({
    queryKey: ['credentials', 'project', projectId] as const,
    queryFn: () => apiList<Credential>(`/api/projects/${projectId}/credentials`),
  });
}

export function useCredential(id: string) {
  return useQuery({
    queryKey: credentialKeys.detail(id),
    queryFn: () => apiGet<Credential>(`/api/credentials/${id}`),
  });
}

export function useCreateCredential() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPost<Credential>('/api/credentials', input),
    onSuccess: () => client.invalidateQueries({ queryKey: credentialKeys.all }),
  });
}

export function useUpdateCredential(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPatch<Credential>(`/api/credentials/${id}`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: credentialKeys.all }),
  });
}

export function useDeleteCredential(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => apiDelete(`/api/credentials/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: credentialKeys.all }),
  });
}

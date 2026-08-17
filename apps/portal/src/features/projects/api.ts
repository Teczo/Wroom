import type { Project, ProjectType, PublishedProject } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from '../../lib/api';

export const projectKeys = {
  all: ['projects'] as const,
  list: (filters: Record<string, string | undefined>) => ['projects', 'list', filters] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
};

export function useProjectTypes() {
  return useQuery({
    queryKey: ['project-types'],
    queryFn: () => apiList<ProjectType>('/api/project-types'),
    staleTime: 5 * 60_000,
  });
}

export function useProjects(filters: { productId?: string; status?: string; q?: string } = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => apiList<Project>('/api/projects', { query: { ...filters, limit: 100 } }),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiGet<Project>(`/api/projects/${id}`),
  });
}

export function useCreateProject() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost<Project>('/api/projects', input),
    onSuccess: () => client.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPatch<Project>(`/api/projects/${id}`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

/** Publishing is its own action — never a side effect of saving the project. */
export function usePublishProject(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<PublishedProject>(`/api/projects/${id}/publish`),
    onSuccess: () => client.invalidateQueries({ queryKey: projectKeys.detail(id) }),
  });
}

export function useUnpublishProject(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => apiDelete(`/api/projects/${id}/publish`),
    onSuccess: () => client.invalidateQueries({ queryKey: projectKeys.detail(id) }),
  });
}

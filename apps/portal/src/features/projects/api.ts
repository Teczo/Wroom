import type { Project, ProjectType, PublishedProject } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from '../../lib/api';

export const projectKeys = {
  all: ['projects'] as const,
  list: (filters: Record<string, string | boolean | undefined>) =>
    ['projects', 'list', filters] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
};

export type ProjectFilters = {
  /** Repeated values are an OR within a field, and AND across fields. */
  status?: string[];
  productId?: string[];
  projectTypeKey?: string[];
  tag?: string[];
  q?: string;
  /** Archived projects are out of the list unless this is on. */
  includeArchived?: boolean;
  page?: number;
  limit?: number;
};

export function useProjectTypes() {
  return useQuery({
    queryKey: ['project-types'],
    queryFn: () => apiList<ProjectType>('/api/project-types'),
    staleTime: 5 * 60_000,
  });
}

/**
 * Repeated parameters are what the API expects for an OR, and `URLSearchParams`
 * is what expresses that — so the query string is built here rather than handed
 * to the client as a flat object.
 */
function toSearchParams(filters: ProjectFilters): URLSearchParams {
  const params = new URLSearchParams();

  for (const field of ['status', 'productId', 'projectTypeKey', 'tag'] as const) {
    for (const value of filters[field] ?? []) params.append(field, value);
  }
  if (filters.q) params.set('q', filters.q);
  if (filters.includeArchived) params.set('includeArchived', 'true');
  params.set('limit', String(filters.limit ?? 100));
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));

  return params;
}

export function useProjects(filters: ProjectFilters = {}) {
  const search = toSearchParams(filters).toString();

  return useQuery({
    queryKey: [...projectKeys.all, 'list', search] as const,
    queryFn: () => apiList<Project>(`/api/projects?${search}`),
  });
}

/** The tags in use across projects, for the filter list. */
export function useProjectTags() {
  return useQuery({
    queryKey: ['projects', 'tags'],
    queryFn: () => apiList<string>('/api/projects/tags'),
    staleTime: 60_000,
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

/**
 * The portfolio subtree, on the endpoint built for it.
 *
 * Never send `portfolio` through `useUpdateProject`. That endpoint takes the
 * whole project, and Mongoose replaces a nested object rather than merging
 * into it — so a body naming one portfolio key resets every other key in the
 * subtree to its schema default. This route writes only the keys it is given,
 * as dotted paths under `portfolio`, which is what makes saving one section at
 * a time safe.
 */
export function useUpdateProjectPortfolio(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPatch<Project>(`/api/projects/${id}/portfolio`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

/**
 * Hard delete. The API refuses with 409 while anything still points at the
 * project, so the caller shows what blocks it rather than forcing it through.
 */
export function useDeleteProject(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => apiDelete(`/api/projects/${id}`),
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

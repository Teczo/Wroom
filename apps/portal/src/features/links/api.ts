import type { ProjectLink, ProjectLinks } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';

export const linkKeys = {
  all: ['project-links'] as const,
  forProject: (projectId: string) => ['project-links', projectId] as const,
};

export function useProjectLinks(projectId: string) {
  return useQuery({
    queryKey: linkKeys.forProject(projectId),
    queryFn: () => apiGet<ProjectLinks>(`/api/projects/${projectId}/links`),
  });
}

/**
 * A link shows on two projects' pages, so every write invalidates all of them
 * rather than just the one being looked at.
 */
function useLinkMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: linkKeys.all }),
  });
}

export function useCreateLink(projectId: string) {
  return useLinkMutation((input: Record<string, unknown>) =>
    apiPost<ProjectLink>(`/api/projects/${projectId}/links`, input),
  );
}

export function useUpdateLink() {
  return useLinkMutation(({ id, ...input }: { id: string } & Record<string, unknown>) =>
    apiPatch<ProjectLink>(`/api/project-links/${id}`, input),
  );
}

export function useDeleteLink() {
  return useLinkMutation((id: string) => apiDelete(`/api/project-links/${id}`));
}

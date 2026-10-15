import type { ProjectDoc, ProjectDocSummary } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiList, apiPost } from '../../lib/api';
import { projectKeys } from '../projects/api';

/**
 * A hands-off project's CLAUDE.md versions. Versions are saved from a chat
 * through the MCP and never edited; the one write here is the push.
 */

export const projectDocKeys = {
  all: ['project-docs'] as const,
  list: (projectId: string) => ['project-docs', projectId, 'list'] as const,
  version: (projectId: string, version: number) =>
    ['project-docs', projectId, 'version', version] as const,
};

/** Newest first, without the text. */
export function useProjectDocs(projectId: string) {
  return useQuery({
    queryKey: projectDocKeys.list(projectId),
    queryFn: () => apiList<ProjectDocSummary>(`/api/projects/${projectId}/docs`),
  });
}

/** One version with its text. A version never changes, so it is never refetched. */
export function useProjectDoc(projectId: string, version: number | null) {
  return useQuery({
    queryKey: projectDocKeys.version(projectId, version ?? 0),
    queryFn: () => apiGet<ProjectDoc>(`/api/projects/${projectId}/docs/${version}`),
    enabled: version !== null,
    staleTime: Infinity,
  });
}

export type PushResult = {
  doc: ProjectDocSummary;
  repo: { fullName: string; defaultBranch: string; url: string };
};

/**
 * Creates the project's private repo and pushes the newest version into it.
 * The project's repo and the version's pushed mark both change, so both are
 * refetched.
 */
export function usePushProjectDoc(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { name?: string }) =>
      apiPost<PushResult>(`/api/projects/${projectId}/docs/push`, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: projectDocKeys.all });
      void client.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

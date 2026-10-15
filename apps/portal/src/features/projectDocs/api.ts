import type { ProjectDoc, ProjectDocSummary } from '@wroom/shared';
import { useQuery } from '@tanstack/react-query';

import { apiGet, apiList } from '../../lib/api';

/**
 * A hands-off project's CLAUDE.md versions. Read-only here: versions are saved
 * from a chat through the MCP, and never edited.
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

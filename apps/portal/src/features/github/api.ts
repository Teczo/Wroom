import type { GitHubStatus } from '@wroom/shared';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../lib/api';

/**
 * A hands-off project's progress, read live from its repo. The API caches it
 * for five minutes, so asking more often than that gets the same answer.
 */
export function useGitHubStatus(projectId: string) {
  return useQuery({
    queryKey: ['github-status', projectId],
    queryFn: () => apiGet<GitHubStatus>(`/api/projects/${projectId}/github-status`),
    staleTime: 5 * 60_000,
    // One more go, not the usual two: an unreachable GitHub stays unreachable,
    // and the panel should say so rather than spin.
    retry: 1,
  });
}

import type { PublishedProject } from '@wroom/shared';
import { useQuery } from '@tanstack/react-query';

import { publicList } from '../../lib/api';

/**
 * The projects the landing page shows, and how many of them.
 *
 * `/public/projects` already sorts featured first, so asking it for the first
 * `limit` rows is what "the featured ones, up to this many" means — no second
 * request and no fifth public route (§6).
 *
 * The limit is authored on the `landing` record, so the query waits until that
 * record has been answered for. Firing at a guessed limit first would fetch one
 * list, then immediately fetch another.
 */
export function useFeaturedProjects(limit: number, enabled: boolean) {
  return useQuery({
    queryKey: ['published-projects', 'landing', limit],
    queryFn: () => publicList<PublishedProject>('/public/projects', { limit }),
    staleTime: 5 * 60_000,
    enabled,
  });
}

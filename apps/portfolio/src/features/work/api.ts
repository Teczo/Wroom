import type { PublishedProject } from '@wroom/shared';
import { useQuery } from '@tanstack/react-query';

import { publicGet, publicList } from '../../lib/api';

export function usePublishedProjects() {
  return useQuery({
    queryKey: ['published-projects'],
    queryFn: () => publicList<PublishedProject>('/public/projects', { limit: 100 }),
    staleTime: 5 * 60_000,
  });
}

export function usePublishedProject(slug: string) {
  return useQuery({
    queryKey: ['published-projects', slug],
    queryFn: () => publicGet<PublishedProject>(`/public/projects/${slug}`),
    staleTime: 5 * 60_000,
  });
}

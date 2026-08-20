import type { SiteContentBody } from '@wroom/shared';
import { useQuery } from '@tanstack/react-query';

import { publicGet } from '../../lib/api';

/**
 * A page's published copy. `/public/content/:key` serves the published
 * sub-document only and 404s when nothing has been published, so there is no
 * draft to guard against here — the API never sends one.
 */
export function usePublishedContent(key: string) {
  return useQuery({
    queryKey: ['site-content', key],
    queryFn: () => publicGet<SiteContentBody>(`/public/content/${key}`),
    staleTime: 5 * 60_000,
    // A page that has never been published is a 404, and retrying will not
    // publish it. Fail straight to the not-found page instead.
    retry: false,
  });
}

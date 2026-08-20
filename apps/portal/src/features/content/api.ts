import type { SiteContent, SiteContentSummary } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiList, apiPatch, apiPost } from '../../lib/api';

export const contentKeys = {
  all: ['site-content'] as const,
  detail: (key: string) => ['site-content', key] as const,
};

export function useSiteContentList() {
  return useQuery({
    queryKey: contentKeys.all,
    queryFn: () => apiList<SiteContentSummary>('/api/content'),
  });
}

export function useSiteContentRecord(key: string) {
  return useQuery({
    queryKey: contentKeys.detail(key),
    queryFn: () => apiGet<SiteContent>(`/api/content/${key}`),
    enabled: key !== '',
  });
}

function useContentMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.all }),
  });
}

/** Writes the draft. Nothing here can change what the public site serves. */
export function useSaveDraft(key: string) {
  return useContentMutation((input: Record<string, unknown>) =>
    apiPatch<SiteContent>(`/api/content/${key}`, input),
  );
}

/** The explicit action that replaces the live copy with the draft. */
export function usePublishContent(key: string) {
  return useContentMutation(() => apiPost<SiteContent>(`/api/content/${key}/publish`));
}

export function useUnpublishContent(key: string) {
  return useContentMutation(() => apiPost<SiteContent>(`/api/content/${key}/unpublish`));
}

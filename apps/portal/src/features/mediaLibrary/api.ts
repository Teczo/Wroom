import type { MediaLibraryItem } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';

export const mediaLibraryKeys = {
  all: ['media-library'] as const,
};

export function useMediaLibrary() {
  return useQuery({
    queryKey: mediaLibraryKeys.all,
    queryFn: () => apiList<MediaLibraryItem>('/api/media-library'),
  });
}

function useMarkMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: mediaLibraryKeys.all }),
  });
}

export function useCreateMark() {
  return useMarkMutation((input: Record<string, unknown>) =>
    apiPost<MediaLibraryItem>('/api/media-library', input),
  );
}

export function useUpdateMark() {
  return useMarkMutation(({ id, ...input }: { id: string } & Record<string, unknown>) =>
    apiPatch<MediaLibraryItem>(`/api/media-library/${id}`, input),
  );
}

export function useDeleteMark() {
  return useMarkMutation((id: string) => apiDelete(`/api/media-library/${id}`));
}

import type { Asset } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPost } from '../../lib/api';

export type UploadTicket = {
  uploadUrl: string;
  blobName: string;
  expiresAt: string;
};

export const assetKeys = {
  forProject: (projectId: string) => ['assets', projectId] as const,
};

export function useAssets(projectId: string) {
  return useQuery({
    queryKey: assetKeys.forProject(projectId),
    queryFn: () => apiList<Asset>(`/api/projects/${projectId}/assets`),
  });
}

/** Asks for a signed URL. The API checks type and size before issuing one. */
export function useRequestUploadUrl(projectId: string) {
  return useMutation({
    mutationFn: (input: { filename: string; mimeType: string; sizeBytes: number }) =>
      apiPost<UploadTicket>(`/api/projects/${projectId}/assets/upload-url`, input),
  });
}

/** Registers the blob once it is up there. `blobName` comes from the ticket. */
export function useCreateAsset(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPost<Asset>(`/api/projects/${projectId}/assets`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: assetKeys.forProject(projectId) }),
  });
}

export function useDeleteAsset(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/projects/${projectId}/assets/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: assetKeys.forProject(projectId) }),
  });
}

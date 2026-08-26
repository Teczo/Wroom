import type { Asset, PublishGateResult } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';

export type UploadTicket = {
  uploadUrl: string;
  blobName: string;
  expiresAt: string;
};

/**
 * The API attaches the gate result to every asset, computed with the shared
 * function. The portal renders it and never works out publishability itself.
 */
export type AssetWithPublishState = Asset & { publishState: PublishGateResult };

export const assetKeys = {
  forProject: (projectId: string) => ['assets', projectId] as const,
};

export function useAssets(projectId: string) {
  return useQuery({
    queryKey: assetKeys.forProject(projectId),
    queryFn: () => apiList<AssetWithPublishState>(`/api/projects/${projectId}/assets`),
  });
}

export function useUpdateAsset(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      apiPatch<Asset>(`/api/projects/${projectId}/assets/${id}`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: assetKeys.forProject(projectId) }),
  });
}

/** The whole ordering in one request, so a move is one write. */
export function useReorderAssets(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (assetIds: string[]) =>
      apiPatch<{ reordered: number }>(`/api/projects/${projectId}/assets/order`, { assetIds }),
    onSuccess: () => client.invalidateQueries({ queryKey: assetKeys.forProject(projectId) }),
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

/**
 * The site's own assets — the portrait, and anything else that belongs to the
 * portfolio's pages rather than to a project.
 *
 * Same collection, same service, same upload flow. What differs is the gate:
 * with no project and no product to read, one of these is publishable on its
 * own visibility alone, which is why `publishState` still rides along.
 */
export const siteAssetKeys = { all: ['site-assets'] as const };

export function useSiteAssets() {
  return useQuery({
    queryKey: siteAssetKeys.all,
    queryFn: () => apiList<AssetWithPublishState>('/api/site-assets'),
  });
}

export function useRequestSiteUploadUrl() {
  return useMutation({
    mutationFn: (input: { filename: string; mimeType: string; sizeBytes: number }) =>
      apiPost<UploadTicket>('/api/site-assets/upload-url', input),
  });
}

export function useCreateSiteAsset() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost<Asset>('/api/site-assets', input),
    onSuccess: () => client.invalidateQueries({ queryKey: siteAssetKeys.all }),
  });
}

/** Marking one public is what lets a page publish it (CLAUDE.md §8). */
export function useUpdateSiteAsset() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      apiPatch<Asset>(`/api/site-assets/${id}`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: siteAssetKeys.all }),
  });
}

export function useDeleteSiteAsset() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/site-assets/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: siteAssetKeys.all }),
  });
}

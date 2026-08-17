import type { Feature, FeatureStatus } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';
import { projectKeys } from '../projects/api';

const featureKeys = {
  list: (projectId: string) => ['projects', projectId, 'features'] as const,
};

export function useFeatures(projectId: string) {
  return useQuery({
    queryKey: featureKeys.list(projectId),
    queryFn: () => apiList<Feature>(`/api/projects/${projectId}/features`),
  });
}

/** Moving a card also changes the rollup, so the project detail is refreshed too. */
function useFeatureMutation<TInput>(
  projectId: string,
  mutationFn: (input: TInput) => Promise<unknown>,
) {
  const client = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: featureKeys.list(projectId) }),
        client.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      ]);
    },
  });
}

export function useCreateFeature(projectId: string) {
  return useFeatureMutation(projectId, (input: Record<string, unknown>) =>
    apiPost<Feature>(`/api/projects/${projectId}/features`, input),
  );
}

export function useUpdateFeature(projectId: string) {
  return useFeatureMutation(
    projectId,
    ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      apiPatch<Feature>(`/api/projects/${projectId}/features/${id}`, input),
  );
}

export function useMoveFeature(projectId: string) {
  return useFeatureMutation(
    projectId,
    ({ id, status, order }: { id: string; status: FeatureStatus; order: number }) =>
      apiPatch<Feature>(`/api/projects/${projectId}/features/${id}/move`, { status, order }),
  );
}

export function useDeleteFeature(projectId: string) {
  return useFeatureMutation(projectId, (id: string) =>
    apiDelete(`/api/projects/${projectId}/features/${id}`),
  );
}

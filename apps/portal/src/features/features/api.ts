import type { Feature, FeatureStatus, ListMeta } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';
import { projectKeys } from '../projects/api';

export const featureKeys = {
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

type Move = {
  id: string;
  status: FeatureStatus;
  order: number;
  /** Required by the API when moving into `blocked`. */
  blockedReason?: string | null;
};
type FeatureList = { items: Feature[]; meta: ListMeta };

/**
 * The card moves the instant it is dropped, then the server confirms. If the
 * write fails the board snaps back to exactly what it looked like before, so a
 * rejected move is visible rather than silently lost.
 */
export function useMoveFeature(projectId: string) {
  const client = useQueryClient();
  const key = featureKeys.list(projectId);

  return useMutation({
    mutationFn: ({ id, status, order, blockedReason }: Move) =>
      apiPatch<Feature>(`/api/projects/${projectId}/features/${id}/move`, {
        status,
        order,
        blockedReason: blockedReason ?? null,
      }),

    onMutate: async (move: Move) => {
      // Stop an in-flight refetch from overwriting the optimistic board.
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<FeatureList>(key);

      client.setQueryData<FeatureList>(key, (current) =>
        current === undefined
          ? current
          : {
              ...current,
              items: current.items.map((feature) =>
                feature._id === move.id
                  ? {
                      ...feature,
                      status: move.status,
                      order: move.order,
                      blockedReason:
                        move.status === 'blocked' ? (move.blockedReason ?? null) : null,
                    }
                  : feature,
              ),
            },
      );

      return { previous };
    },

    onError: (_error, _move, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },

    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      ]);
    },
  });
}

export function useDeleteFeature(projectId: string) {
  return useFeatureMutation(projectId, (id: string) =>
    apiDelete(`/api/projects/${projectId}/features/${id}`),
  );
}

import type { Decision } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';

export const decisionKeys = {
  all: ['decisions'] as const,
  forProject: (projectId: string) => ['decisions', projectId] as const,
};

export function useDecisions(projectId: string) {
  return useQuery({
    queryKey: decisionKeys.forProject(projectId),
    queryFn: () => apiList<Decision>(`/api/projects/${projectId}/decisions`),
  });
}

function useDecisionMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: decisionKeys.all }),
  });
}

export function useCreateDecision(projectId: string) {
  return useDecisionMutation((input: Record<string, unknown>) =>
    apiPost<Decision>(`/api/projects/${projectId}/decisions`, input),
  );
}

export function useUpdateDecision() {
  return useDecisionMutation(({ id, ...input }: { id: string } & Record<string, unknown>) =>
    apiPatch<Decision>(`/api/decisions/${id}`, input),
  );
}

/** One action: marks the decision superseded and records what replaced it. */
export function useSupersedeDecision() {
  return useDecisionMutation(
    ({ id, supersededByDecisionId }: { id: string; supersededByDecisionId: string }) =>
      apiPost<Decision>(`/api/decisions/${id}/supersede`, { supersededByDecisionId }),
  );
}

export function useDeleteDecision() {
  return useDecisionMutation((id: string) => apiDelete(`/api/decisions/${id}`));
}

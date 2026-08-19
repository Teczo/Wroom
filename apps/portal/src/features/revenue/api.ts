import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';
import { projectKeys } from '../projects/api';

export type RevenueEntry = {
  _id: string;
  projectId: string;
  source: string;
  customerRef: string;
  description: string;
  amount: number;
  currency: string;
  amountAud: number;
  paid: boolean;
  paidAt: string | null;
  dueAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
};

export const revenueKeys = {
  forProject: (projectId: string) => ['revenue', projectId] as const,
};

export function useRevenue(projectId: string) {
  return useQuery({
    queryKey: revenueKeys.forProject(projectId),
    queryFn: () => apiList<RevenueEntry>(`/api/projects/${projectId}/revenue`),
  });
}

/** Revenue moves the rollup, so the project is refreshed alongside it. */
function useRevenueMutation<TInput>(projectId: string, run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: revenueKeys.forProject(projectId) }),
        client.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      ]);
    },
  });
}

export function useCreateRevenue(projectId: string) {
  return useRevenueMutation(projectId, (input: Record<string, unknown>) =>
    apiPost<RevenueEntry>(`/api/projects/${projectId}/revenue`, input),
  );
}

export function useUpdateRevenue(projectId: string) {
  return useRevenueMutation(
    projectId,
    ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      apiPatch<RevenueEntry>(`/api/revenue/${id}`, input),
  );
}

export function useMarkRevenuePaid(projectId: string) {
  return useRevenueMutation(projectId, (id: string) =>
    apiPost<RevenueEntry>(`/api/revenue/${id}/paid`, { paidAt: new Date().toISOString() }),
  );
}

export function useDeleteRevenue(projectId: string) {
  return useRevenueMutation(projectId, (id: string) => apiDelete(`/api/revenue/${id}`));
}

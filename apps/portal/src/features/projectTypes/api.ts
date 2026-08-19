import type { ProjectType } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';

export const projectTypeKeys = {
  all: ['project-types'] as const,
  list: (includeInactive: boolean) => ['project-types', { includeInactive }] as const,
};

/** The admin list wants everything; the create-project form wants active only. */
export function useAllProjectTypes(includeInactive = true) {
  return useQuery({
    queryKey: projectTypeKeys.list(includeInactive),
    queryFn: () =>
      apiList<ProjectType>('/api/project-types', {
        query: includeInactive ? { includeInactive: 'true' } : {},
      }),
  });
}

function useProjectTypeMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: projectTypeKeys.all }),
  });
}

export function useCreateProjectType() {
  return useProjectTypeMutation((input: Record<string, unknown>) =>
    apiPost<ProjectType>('/api/project-types', input),
  );
}

export function useUpdateProjectType() {
  return useProjectTypeMutation(({ id, ...input }: { id: string } & Record<string, unknown>) =>
    apiPatch<ProjectType>(`/api/project-types/${id}`, input),
  );
}

export function useDeleteProjectType() {
  return useProjectTypeMutation((id: string) => apiDelete(`/api/project-types/${id}`));
}

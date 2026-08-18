import type { Note } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';

export const noteKeys = {
  all: ['notes'] as const,
  forProject: (projectId: string, kind: string | undefined) =>
    ['notes', projectId, kind ?? 'all'] as const,
};

export function useNotes(projectId: string, filters: { kind?: string } = {}) {
  return useQuery({
    queryKey: noteKeys.forProject(projectId, filters.kind),
    queryFn: () => apiList<Note>(`/api/projects/${projectId}/notes`, { query: filters }),
  });
}

function useNoteMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useCreateNote(projectId: string) {
  return useNoteMutation((input: Record<string, unknown>) =>
    apiPost<Note>(`/api/projects/${projectId}/notes`, input),
  );
}

export function useUpdateNote() {
  return useNoteMutation(({ id, ...input }: { id: string } & Record<string, unknown>) =>
    apiPatch<Note>(`/api/notes/${id}`, input),
  );
}

export function useDeleteNote() {
  return useNoteMutation((id: string) => apiDelete(`/api/notes/${id}`));
}

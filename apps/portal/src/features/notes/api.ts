import type { Note } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiList, apiPatch, apiPost } from '../../lib/api';

/**
 * Notes hang off a project or an enquiry. The owner is passed around as one
 * value rather than two optional ids, so no caller can accidentally ask for
 * both or neither.
 */
export type NoteOwner = { projectId: string } | { enquiryId: string };

function ownerPath(owner: NoteOwner): string {
  return 'projectId' in owner
    ? `/api/projects/${owner.projectId}/notes`
    : `/api/enquiries/${owner.enquiryId}/notes`;
}

function ownerKey(owner: NoteOwner): string {
  return 'projectId' in owner ? `project:${owner.projectId}` : `enquiry:${owner.enquiryId}`;
}

export const noteKeys = {
  all: ['notes'] as const,
  forOwner: (owner: NoteOwner, kind: string | undefined) =>
    ['notes', ownerKey(owner), kind ?? 'all'] as const,
};

export function useNotes(owner: NoteOwner, filters: { kind?: string } = {}) {
  return useQuery({
    queryKey: noteKeys.forOwner(owner, filters.kind),
    queryFn: () => apiList<Note>(ownerPath(owner), { query: filters }),
  });
}

function useNoteMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useCreateNote(owner: NoteOwner) {
  return useNoteMutation((input: Record<string, unknown>) =>
    apiPost<Note>(ownerPath(owner), input),
  );
}

/** Editing and deleting go by note id, whichever owner the note has. */
export function useUpdateNote() {
  return useNoteMutation(({ id, ...input }: { id: string } & Record<string, unknown>) =>
    apiPatch<Note>(`/api/notes/${id}`, input),
  );
}

export function useDeleteNote() {
  return useNoteMutation((id: string) => apiDelete(`/api/notes/${id}`));
}

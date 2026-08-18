import type { Infer, noteCreateShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { FeatureModel } from '../models/Feature.js';
import { NoteModel, type NoteDocument } from '../models/Note.js';
import { ProjectModel } from '../models/Project.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

type NoteInput = Infer<typeof noteCreateShape>;

/**
 * Free notes against a project. Pinned first, then newest — the two orderings
 * that matter when you open a project on a phone and want the last thing you
 * thought about it.
 */

export type NoteListFilters = { kind?: string; featureId?: string };

export async function listNotes(
  projectId: string,
  filters: NoteListFilters,
): Promise<NoteDocument[]> {
  await assertProjectFound(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.kind) query.kind = filters.kind;
  if (filters.featureId) query.featureId = filters.featureId;

  return NoteModel.find(query).sort({ pinned: -1, createdAt: -1 });
}

export async function getNote(id: string): Promise<NoteDocument> {
  const note = await NoteModel.findById(id);
  if (!note) throw new NotFoundError('That note');
  return note;
}

export async function createNote(
  projectId: string,
  input: NoteInput,
  authorUserId: Types.ObjectId,
): Promise<NoteDocument> {
  await assertProjectFound(projectId);
  await assertFeatureInProject(projectId, input.featureId);

  // The author is the signed-in user, never whatever the body claimed.
  return NoteModel.create({ ...input, projectId, authorUserId });
}

export async function updateNote(
  id: string,
  input: Partial<NoteInput>,
): Promise<NoteDocument> {
  const note = await getNote(id);

  if (input.featureId) {
    await assertFeatureInProject(String(note.projectId), input.featureId);
  }

  note.set(input);
  await note.save();
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  const note = await getNote(id);
  await note.deleteOne();
}

async function assertProjectFound(projectId: string): Promise<void> {
  const exists = await ProjectModel.exists({ _id: projectId });
  if (!exists) throw new NotFoundError('That project');
}

/** A note can hang off a feature, but only one belonging to the same project. */
async function assertFeatureInProject(
  projectId: string,
  featureId: string | null | undefined,
): Promise<void> {
  if (!featureId) return;

  const exists = await FeatureModel.exists({ _id: featureId, projectId });
  if (!exists) {
    throw new ValidationError('That feature does not belong to this project.', {
      featureId: 'That feature does not belong to this project.',
    });
  }
}

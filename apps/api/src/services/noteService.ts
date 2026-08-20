import type { Infer, noteCreateShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { EnquiryModel } from '../models/Enquiry.js';
import { FeatureModel } from '../models/Feature.js';
import { NoteModel, type NoteDocument } from '../models/Note.js';
import { ProjectModel } from '../models/Project.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

type NoteInput = Infer<typeof noteCreateShape>;

/**
 * Free notes, pinned first then newest — the two orderings that matter when you
 * open something on a phone and want the last thing you thought about it.
 *
 * A note hangs off a project or an enquiry. Everything below takes that owner
 * as one argument rather than branching on two ids, so the two kinds cannot
 * drift apart in ordering, filtering or authorship.
 */

/** Which thing a note belongs to. Exactly one, by construction. */
export type NoteOwner = { projectId: string } | { enquiryId: string };

export type NoteListFilters = { kind?: string; featureId?: string };

function ownerQuery(owner: NoteOwner): Record<string, unknown> {
  return 'projectId' in owner
    ? { projectId: owner.projectId }
    : { enquiryId: owner.enquiryId };
}

async function assertOwnerFound(owner: NoteOwner): Promise<void> {
  if ('projectId' in owner) {
    const exists = await ProjectModel.exists({ _id: owner.projectId });
    if (!exists) throw new NotFoundError('That project');
    return;
  }

  const exists = await EnquiryModel.exists({ _id: owner.enquiryId });
  if (!exists) throw new NotFoundError('That enquiry');
}

export async function listNotes(
  owner: NoteOwner,
  filters: NoteListFilters,
): Promise<NoteDocument[]> {
  await assertOwnerFound(owner);

  const query: Record<string, unknown> = ownerQuery(owner);
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
  owner: NoteOwner,
  input: NoteInput | Omit<NoteInput, 'featureId'>,
  authorUserId: Types.ObjectId,
): Promise<NoteDocument> {
  await assertOwnerFound(owner);

  const featureId = 'featureId' in input ? input.featureId : null;

  if ('projectId' in owner) {
    await assertFeatureInProject(owner.projectId, featureId);
  } else if (featureId) {
    throw new ValidationError('An enquiry note cannot belong to a feature.', {
      featureId: 'An enquiry has no features.',
    });
  }

  // The author is the signed-in user, never whatever the body claimed.
  return NoteModel.create({ ...input, ...ownerQuery(owner), authorUserId });
}

export async function updateNote(
  id: string,
  input: Partial<NoteInput>,
): Promise<NoteDocument> {
  const note = await getNote(id);

  if (input.featureId) {
    if (!note.projectId) {
      throw new ValidationError('An enquiry note cannot belong to a feature.', {
        featureId: 'An enquiry has no features.',
      });
    }
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

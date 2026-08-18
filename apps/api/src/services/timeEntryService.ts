import type { Infer, timeEntryCreateShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { TimeEntryModel, type TimeEntryDocument } from '../models/TimeEntry.js';
import type { UserDocument } from '../models/User.js';
import { NotFoundError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';
import { getProject } from './projectService.js';
import { recomputeProjectRollup } from './rollupService.js';

type TimeEntryInput = Infer<typeof timeEntryCreateShape>;

export async function listTimeEntries(
  projectId: string,
  filters: { featureId?: string },
  pagination: Pagination,
): Promise<{ items: TimeEntryDocument[]; total: number }> {
  await getProject(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.featureId) query.featureId = filters.featureId;

  const [items, total] = await Promise.all([
    TimeEntryModel.find(query).sort({ date: -1 }).skip(pagination.skip).limit(pagination.limit),
    TimeEntryModel.countDocuments(query),
  ]);

  return { items, total };
}

/**
 * The rate is snapshotted from the user at entry, never read live. Changing your
 * rate later must not rewrite what past work was worth.
 */
export async function createTimeEntry(
  projectId: string,
  input: TimeEntryInput,
  user: UserDocument,
): Promise<TimeEntryDocument> {
  await getProject(projectId);

  const entry = await TimeEntryModel.create({
    ...input,
    projectId,
    userId: user._id as Types.ObjectId,
    rateAud: user.defaultHourlyRateAud,
  });

  await recomputeProjectRollup(projectId);
  return entry;
}

export async function getTimeEntry(projectId: string, id: string): Promise<TimeEntryDocument> {
  const entry = await TimeEntryModel.findOne({ _id: id, projectId });
  if (!entry) throw new NotFoundError('That time entry');
  return entry;
}

export async function updateTimeEntry(
  projectId: string,
  id: string,
  input: Partial<TimeEntryInput>,
): Promise<TimeEntryDocument> {
  const entry = await getTimeEntry(projectId, id);

  // `rateAud` is deliberately not patchable — it is a historical snapshot.
  entry.set(input);
  await entry.save();

  await recomputeProjectRollup(projectId);
  return entry;
}

export async function deleteTimeEntry(projectId: string, id: string): Promise<void> {
  const entry = await getTimeEntry(projectId, id);
  await entry.deleteOne();
  await recomputeProjectRollup(projectId);
}

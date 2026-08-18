import { FEATURE_ORDER_GAP, type FeatureStatus, type Infer, type featureCreateShape } from '@wroom/shared';

import { FeatureModel, type FeatureDocument } from '../models/Feature.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { containsFilter } from '../utils/query.js';
import { getProject } from './projectService.js';
import { recomputeProjectRollup } from './rollupService.js';

type FeatureInput = Infer<typeof featureCreateShape>;

export type FeatureListFilters = {
  status?: string;
  priority?: string;
  search?: string;
};

/**
 * The whole board in one read. Features are cheap and a project has tens of
 * them, not thousands, so the Kanban view is not paginated — it would break
 * drag ordering if it were.
 */
export async function listFeatures(
  projectId: string,
  filters: FeatureListFilters,
): Promise<FeatureDocument[]> {
  await getProject(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.search) query.title = containsFilter(filters.search);

  return FeatureModel.find(query).sort({ status: 1, order: 1 });
}

export async function getFeature(projectId: string, id: string): Promise<FeatureDocument> {
  const feature = await FeatureModel.findOne({ _id: id, projectId });
  if (!feature) throw new NotFoundError('That feature');
  return feature;
}

export async function createFeature(
  projectId: string,
  input: FeatureInput,
): Promise<FeatureDocument> {
  await getProject(projectId);

  const clash = await FeatureModel.findOne({ projectId, ref: input.ref }).select('_id');
  if (clash) {
    throw new ConflictError(`'${input.ref}' is already used by another feature on this project.`);
  }

  const feature = await FeatureModel.create({
    ...input,
    projectId,
    order: input.order ?? (await nextOrder(projectId, input.status)),
    completedAt: input.status === 'done' ? new Date() : null,
  });

  await recomputeProjectRollup(projectId);
  return feature;
}

export async function updateFeature(
  projectId: string,
  id: string,
  input: Partial<FeatureInput>,
): Promise<FeatureDocument> {
  const feature = await getFeature(projectId, id);

  if (input.ref && input.ref !== feature.ref) {
    const clash = await FeatureModel.findOne({ projectId, ref: input.ref }).select('_id');
    if (clash) {
      throw new ConflictError(`'${input.ref}' is already used by another feature on this project.`);
    }
  }

  const patch: Record<string, unknown> = { ...input };
  if (input.status) patch.completedAt = completionStamp(feature, input.status);

  feature.set(patch);
  await feature.save();

  await recomputeProjectRollup(projectId);
  return feature;
}

/** The Kanban drag: a new column and a new position within it. */
export async function moveFeature(
  projectId: string,
  id: string,
  move: { status: FeatureStatus; order: number },
): Promise<FeatureDocument> {
  const feature = await getFeature(projectId, id);

  feature.set({
    status: move.status,
    order: move.order,
    completedAt: completionStamp(feature, move.status),
  });
  await feature.save();

  await recomputeProjectRollup(projectId);
  return feature;
}

export async function deleteFeature(projectId: string, id: string): Promise<void> {
  const feature = await getFeature(projectId, id);
  await feature.deleteOne();
  await recomputeProjectRollup(projectId);
}

/**
 * `completedAt` is stamped when a feature first reaches done and cleared when it
 * leaves — reopening a feature should not keep a stale completion date.
 */
function completionStamp(feature: FeatureDocument, nextStatus: FeatureStatus): Date | null {
  if (nextStatus !== 'done') return null;
  return feature.completedAt ?? new Date();
}

/** Appends to the end of the target column, leaving gaps of 1000 to drag into. */
async function nextOrder(projectId: string, status: string): Promise<number> {
  const last = await FeatureModel.findOne({ projectId, status })
    .sort({ order: -1 })
    .select('order')
    .lean();

  return (last?.order ?? 0) + FEATURE_ORDER_GAP;
}

import { FEATURE_ORDER_GAP, type FeatureStatus, type Infer, type featureCreateShape } from '@wroom/shared';

import { FeatureModel, type FeatureDocument } from '../models/Feature.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
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
): Promise<Array<Record<string, unknown>>> {
  await getProject(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.search) query.title = containsFilter(filters.search);

  const [items, all] = await Promise.all([
    FeatureModel.find(query).sort({ status: 1, order: 1 }),
    // Every feature in the project, so a dependency outside a filtered view
    // still resolves to a name rather than a bare id.
    FeatureModel.find({ projectId }).select('_id ref title status dependsOnFeatureIds').lean(),
  ]);

  const summaryById = new Map(
    all.map((feature) => [
      String(feature._id),
      { _id: String(feature._id), ref: feature.ref, title: feature.title, status: feature.status },
    ]),
  );

  return items.map((feature) => {
    const id = String(feature._id);

    return {
      ...(feature.toJSON() as Record<string, unknown>),
      dependencies: feature.dependsOnFeatureIds
        .map((dependencyId) => summaryById.get(String(dependencyId)))
        .filter(Boolean),
      dependents: all
        .filter((other) =>
          other.dependsOnFeatureIds.some((dependencyId) => String(dependencyId) === id),
        )
        .map((other) => summaryById.get(String(other._id)))
        .filter(Boolean),
    };
  });
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

  // A feature can be created already depending on others; those still have to
  // be on this project. It has no id yet, so no loop can involve it.
  if (input.dependsOnFeatureIds?.length) {
    await assertDependenciesUsable(projectId, 'unsaved', input.dependsOnFeatureIds);
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

  if (input.dependsOnFeatureIds) {
    await assertDependenciesUsable(projectId, id, input.dependsOnFeatureIds);
  }

  const patch: Record<string, unknown> = { ...input };

  if (input.status) {
    patch.completedAt = completionStamp(feature, input.status);
    patch.blockedReason = blockedReasonFor(
      feature,
      input.status,
      input.blockedReason ?? undefined,
    );
  }

  feature.set(patch);
  await feature.save();

  await recomputeProjectRollup(projectId);
  return feature;
}

/** The Kanban drag: a new column and a new position within it. */
export async function moveFeature(
  projectId: string,
  id: string,
  move: { status: FeatureStatus; order: number; blockedReason?: string | null },
): Promise<FeatureDocument> {
  const feature = await getFeature(projectId, id);
  const cameFrom = feature.status as FeatureStatus;

  feature.set({
    status: move.status,
    order: move.order,
    completedAt: completionStamp(feature, move.status),
    blockedReason: blockedReasonFor(feature, move.status, move.blockedReason ?? undefined),
  });
  await feature.save();

  // Repeated drops between the same pair halve the gap each time. Spread the
  // column back out before the midpoints run out of room.
  await rebalanceColumn(projectId, move.status);
  if (cameFrom !== move.status) await rebalanceColumn(projectId, cameFrom);

  await recomputeProjectRollup(projectId);
  return getFeature(projectId, id);
}

/**
 * Below this, two neighbours are too close to drop a card between them — the
 * midpoint would collide with one of them.
 */
const REBALANCE_MIN_GAP = 2;

/** Rewrites a column's `order` values to clean 1000 spacing, keeping the order. */
async function rebalanceColumn(projectId: string, status: FeatureStatus): Promise<void> {
  const items = await FeatureModel.find({ projectId, status })
    .sort({ order: 1, _id: 1 })
    .select('_id order')
    .lean();

  const tooTight = items.some(
    (item, index) => index > 0 && (item.order ?? 0) - (items[index - 1]?.order ?? 0) < REBALANCE_MIN_GAP,
  );

  if (!tooTight) return;

  await FeatureModel.bulkWrite(
    items.map((item, index) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { order: (index + 1) * FEATURE_ORDER_GAP } },
      },
    })),
  );
}

export async function deleteFeature(projectId: string, id: string): Promise<void> {
  const feature = await getFeature(projectId, id);
  await feature.deleteOne();
  await recomputeProjectRollup(projectId);
}

/**
 * A blocked card with no reason on it is just a card nobody touches, so the
 * reason is required to enter `blocked` and thrown away on the way out.
 */
function blockedReasonFor(
  feature: FeatureDocument,
  nextStatus: FeatureStatus,
  given: string | undefined,
): string | null {
  if (nextStatus !== 'blocked') return null;

  const reason = (given ?? feature.blockedReason ?? '').trim();
  if (reason === '') {
    throw new ValidationError('Say what is blocking this before moving it to blocked.', {
      blockedReason: 'Give a reason — a blocked card without one tells nobody anything.',
    });
  }

  return reason;
}

/**
 * Dependencies must live in the same project, cannot include the feature
 * itself, and cannot close a loop.
 *
 * The walk runs on writes only, over one query for the project's features, so
 * the board's read path is untouched by it.
 */
async function assertDependenciesUsable(
  projectId: string,
  featureId: string,
  dependsOn: string[],
): Promise<void> {
  if (dependsOn.includes(featureId)) {
    throw new ValidationError('A feature cannot depend on itself.', {
      dependsOnFeatureIds: 'A feature cannot depend on itself.',
    });
  }

  const all = await FeatureModel.find({ projectId })
    .select('_id ref title dependsOnFeatureIds')
    .lean();

  const byId = new Map(all.map((feature) => [String(feature._id), feature]));

  for (const dependencyId of dependsOn) {
    if (!byId.has(dependencyId)) {
      throw new ValidationError('Every dependency has to be a feature on this project.', {
        dependsOnFeatureIds: 'That feature is not on this project.',
      });
    }
  }

  // Walk what each proposed dependency itself waits on. Reaching this feature
  // again means the new edge closes a loop.
  const self = byId.get(featureId);

  for (const startId of dependsOn) {
    const trail: string[] = [startId];
    const seen = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: startId, path: trail }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);

      const node = byId.get(id);
      if (!node) continue;

      for (const nextId of node.dependsOnFeatureIds.map(String)) {
        if (nextId === featureId) {
          const chain = [self?.ref ?? 'this feature', ...path.map((step) => byId.get(step)?.ref ?? step)];
          throw new ValidationError(
            `That would make ${chain[0]} and ${byId.get(startId)?.ref ?? 'that feature'} wait on each other (${chain.join(' → ')} → ${chain[0]}).`,
            { dependsOnFeatureIds: 'This dependency closes a loop.' },
          );
        }

        queue.push({ id: nextId, path: [...path, nextId] });
      }
    }
  }
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

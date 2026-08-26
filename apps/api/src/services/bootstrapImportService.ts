import type {
  BootstrapImportDiff,
  BootstrapImportResult,
  BootstrapInsertEntry,
  BootstrapPlanEntry,
  BootstrapUnaffectedEntry,
  BootstrapUpdateEntry,
  BootstrapWriteAction,
  ImportFieldChange,
  Infer,
  bootstrapImportShape,
} from '@wroom/shared';
import mongoose from 'mongoose';

import { FeatureModel, type FeatureDocument } from '../models/Feature.js';
import { ProductModel, type ProductDocument } from '../models/Product.js';
import { ProjectModel, type ProjectDocument } from '../models/Project.js';
import { ConflictError, ValidationError } from '../utils/errors.js';
import { planFeatureRows, writeFeaturePlan, type FeatureRow, type FeaturePlan } from './featureImportService.js';
import { getProjectTypeByKey } from './projectTypeService.js';
import { recomputeProjectRollup } from './rollupService.js';

/**
 * Bootstrap import: a product, a project and its features from one body.
 *
 * The point is the gap between a brainstorm and a project that exists. Today
 * that gap is the portal's create form, filled in after the thinking is already
 * done; this turns it into one call.
 *
 * Matching is on slug for the product and the project, and on ref for the
 * features. Nothing is ever deleted — the same rule the CSV importer follows,
 * and for the same reason: an importer that removes what it was not told about
 * is an importer nobody runs twice.
 *
 * Preview and commit run the same planner. Commit re-plans from the payload
 * rather than accepting a plan handed back by a client, so what gets written is
 * what the server itself worked out.
 */

export type BootstrapPayload = Infer<typeof bootstrapImportShape>;

/** The diff, plus the state a write needs so it does not plan twice. */
export type BootstrapPlan = {
  diff: BootstrapImportDiff;
  product: { action: BootstrapWriteAction; existing: ProductDocument | null };
  project: { action: BootstrapWriteAction; existing: ProjectDocument | null };
  features: FeaturePlan;
};

/** How a value reads in a diff. Arrays join, nulls empty, everything else stringifies. */
function describe(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/** The fields that differ, in the shape the feature importer already reports. */
function changedFields(
  comparisons: Array<[field: string, from: unknown, to: unknown]>,
): ImportFieldChange[] {
  return comparisons
    .map(([field, from, to]) => ({ field, from: describe(from), to: describe(to) }))
    .filter((change) => change.from !== change.to);
}

function productChanges(
  existing: ProductDocument,
  incoming: BootstrapPayload['product'],
): ImportFieldChange[] {
  return changedFields([
    ['name', existing.name, incoming.name],
    ['description', existing.description, incoming.description],
    ['isClientWork', existing.isClientWork, incoming.isClientWork],
    ['clientName', existing.clientName, incoming.clientName],
    ['ndaRestricted', existing.ndaRestricted, incoming.ndaRestricted],
    ['status', existing.status, incoming.status],
  ]);
}

function projectChanges(
  existing: ProjectDocument,
  incoming: BootstrapPayload['project'],
): ImportFieldChange[] {
  return changedFields([
    ['projectTypeKey', existing.projectTypeKey, incoming.projectTypeKey],
    ['name', existing.name, incoming.name],
    ['shortDescription', existing.shortDescription, incoming.shortDescription],
    ['status', existing.status, incoming.status],
    ['phase', existing.phase, incoming.phase],
    ['tags', existing.tags, incoming.tags],
    ['techStack.frontend', existing.techStack.frontend, incoming.techStack.frontend],
    ['techStack.backend', existing.techStack.backend, incoming.techStack.backend],
    ['techStack.database', existing.techStack.database, incoming.techStack.database],
    ['techStack.other', existing.techStack.other, incoming.techStack.other],
    ['repo.provider', existing.repo.provider, incoming.repo.provider],
    ['repo.fullName', existing.repo.fullName, incoming.repo.fullName],
    ['repo.defaultBranch', existing.repo.defaultBranch, incoming.repo.defaultBranch],
  ]);
}

/**
 * The payload's features as the shared planner takes them.
 *
 * Refs are upper-cased on the way in, exactly as the CSV parser does, so the
 * two importers agree on what `WRM-1` and `wrm-1` mean. They would otherwise
 * match different features from the same brainstorm.
 */
function toFeatureRows(features: BootstrapPayload['features']): FeatureRow[] {
  return features.map((feature, index) => ({
    // 1-based, so a message points at the entry a caller can count to.
    row: index + 1,
    ref: feature.ref.toUpperCase(),
    title: feature.title,
    description: feature.description,
    acceptanceCriteria: feature.acceptanceCriteria,
    status: feature.status,
    priority: feature.priority,
    size: feature.size,
    labels: feature.labels,
    dependsOn: feature.dependsOn.map((ref) => ref.toUpperCase()),
  }));
}

/**
 * Works out what the payload would do. Reads, and writes nothing.
 *
 * A product or a project that cannot be written throws rather than appearing in
 * the diff: there is nothing worth importing once the thing the features hang
 * off is wrong, and a caller reading a plan should not have to check whether it
 * is a plan or a complaint.
 */
export async function buildBootstrapPlan(payload: BootstrapPayload): Promise<BootstrapPlan> {
  // Fails here rather than leaving a project pointing at a type that does not
  // exist, which the portal could not render a form for.
  await getProjectTypeByKey(payload.project.projectTypeKey);

  const [existingProduct, existingProject] = await Promise.all([
    ProductModel.findOne({ slug: payload.product.slug }),
    ProjectModel.findOne({ slug: payload.project.slug }),
  ]);

  // Project slugs are unique across the whole collection, so a slug already in
  // use under a different product is a genuine clash — importing would move
  // someone else's project rather than update this one.
  if (
    existingProject &&
    (!existingProduct || String(existingProject.productId) !== String(existingProduct._id))
  ) {
    throw new ConflictError(
      `The project slug '${payload.project.slug}' already belongs to a different product. Pick another slug, or import into the product that owns it.`,
      { projectSlug: payload.project.slug },
    );
  }

  const existingFeatures: FeatureDocument[] = existingProject
    ? await FeatureModel.find({ projectId: existingProject._id })
    : [];

  const features = planFeatureRows(toFeatureRows(payload.features), existingFeatures);

  const productFieldChanges = existingProduct
    ? productChanges(existingProduct, payload.product)
    : [];
  const projectFieldChanges = existingProject
    ? projectChanges(existingProject, payload.project)
    : [];

  const productAction: BootstrapWriteAction = !existingProduct
    ? 'inserted'
    : productFieldChanges.length > 0
      ? 'updated'
      : 'unaffected';

  const projectAction: BootstrapWriteAction = !existingProject
    ? 'inserted'
    : projectFieldChanges.length > 0
      ? 'updated'
      : 'unaffected';

  const inserts: BootstrapInsertEntry[] = [];
  const updates: BootstrapUpdateEntry[] = [];
  const unaffected: BootstrapUnaffectedEntry[] = [];

  const place = (
    action: BootstrapWriteAction,
    entry: BootstrapPlanEntry,
    id: string | null,
    changes: ImportFieldChange[],
  ): void => {
    if (action === 'inserted') inserts.push(entry);
    else if (action === 'updated') updates.push({ ...entry, id: id!, changes });
    else unaffected.push(entry);
  };

  place(
    productAction,
    { kind: 'product', ref: payload.product.slug, label: payload.product.name, row: null },
    existingProduct ? String(existingProduct._id) : null,
    productFieldChanges,
  );

  place(
    projectAction,
    { kind: 'project', ref: payload.project.slug, label: payload.project.name, row: null },
    existingProject ? String(existingProject._id) : null,
    projectFieldChanges,
  );

  for (const row of features.inserts) {
    inserts.push({ kind: 'feature', ref: row.ref, label: row.title, row: row.row });
  }

  for (const row of features.updates) {
    updates.push({
      kind: 'feature',
      ref: row.ref,
      label: row.title,
      row: row.row,
      id: row.featureId,
      changes: row.changes,
    });
  }

  for (const row of features.unaffected) {
    unaffected.push({ kind: 'feature', ref: row.ref, label: row.title, row: null });
  }

  return {
    diff: { inserts, updates, invalid: features.invalid, unaffected },
    product: { action: productAction, existing: existingProduct },
    project: { action: projectAction, existing: existingProject },
    features,
  };
}

/** The plan alone — the preview route answers with exactly this. */
export async function previewBootstrapImport(
  payload: BootstrapPayload,
): Promise<BootstrapImportDiff> {
  const { diff } = await buildBootstrapPlan(payload);
  return diff;
}

/**
 * Writes the payload. One transaction, three passes in order — the project
 * needs the product's id, and the features need the project's.
 *
 * Unlike the CSV importer there is no "skip the bad rows" option. A CSV is
 * hand-edited and skipping a row is a normal way to work; this payload is
 * generated, so an invalid feature means whatever produced it got something
 * wrong and should be told, rather than have part of a brainstorm silently
 * dropped on the floor.
 */
export async function commitBootstrapImport(
  payload: BootstrapPayload,
): Promise<BootstrapImportResult> {
  const plan = await buildBootstrapPlan(payload);

  if (plan.diff.invalid.length > 0) {
    throw new ValidationError(
      `${plan.diff.invalid.length} feature${plan.diff.invalid.length === 1 ? '' : 's'} in this payload cannot be imported. Fix them and send it again.`,
      {
        features: plan.diff.invalid.map(
          (row) => `features[${row.row}] ${row.ref}: ${row.reason}`,
        ),
      },
    );
  }

  const session = await mongoose.startSession();

  let productId = '';
  let projectId = '';
  let featureCounts = { inserted: 0, updated: 0 };

  try {
    await session.withTransaction(async () => {
      // Pass one: the product.
      if (plan.product.existing) {
        productId = String(plan.product.existing._id);

        if (plan.product.action === 'updated') {
          await ProductModel.updateOne(
            { _id: plan.product.existing._id },
            { $set: payload.product },
            { session },
          );
        }
      } else {
        const [created] = await ProductModel.create([payload.product], { session });
        productId = String(created!._id);
      }

      // Pass two: the project, under the product just settled.
      if (plan.project.existing) {
        projectId = String(plan.project.existing._id);

        if (plan.project.action === 'updated') {
          await ProjectModel.updateOne(
            { _id: plan.project.existing._id },
            { $set: payload.project },
            { session },
          );
        }
      } else {
        // `details` is absent by decision and `portfolio` is left to its
        // defaults, which is what keeps a new project private (CLAUDE.md §8).
        const [created] = await ProjectModel.create(
          [{ ...payload.project, productId }],
          { session },
        );
        projectId = String(created!._id);
      }

      // Pass three: the features, through the shared writer.
      featureCounts = await writeFeaturePlan(
        projectId,
        plan.features.valid,
        plan.features.existingByRef,
        session,
        'manual',
      );
    });
  } finally {
    await session.endSession();
  }

  // Once, after everything, rather than per feature.
  await recomputeProjectRollup(projectId);

  return {
    productId,
    projectId,
    product: plan.product.action,
    project: plan.project.action,
    features: { ...featureCounts, skipped: 0 },
  };
}

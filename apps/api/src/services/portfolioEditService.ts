import {
  checkPublishGates,
  type ImportFieldChange,
  type PortfolioUpdateDiff,
  type Visibility,
} from '@wroom/shared';

import { AssetModel } from '../models/Asset.js';
import { ProductModel } from '../models/Product.js';
import { ProjectModel, type ProjectDocument } from '../models/Project.js';
import { ValidationError } from '../utils/errors.js';
import { getProject } from './projectService.js';

/**
 * Editing the case study — the source data a publish later snapshots.
 *
 * Nothing here publishes. Marking a project public makes it *eligible*; the
 * snapshot in `publishedProjects` is only ever written by WRM-044's action.
 * `publishedAt` is not writable from this path at all.
 */

export type PortfolioUpdateResult = {
  project: ProjectDocument;
  /**
   * The WRM-042 gate verdict for the project as it now stands, so the caller
   * can say "saved, but the NDA flag still blocks it" instead of implying the
   * work is live.
   */
  publishState: ReturnType<typeof checkPublishGates>;
  /** Named when the product is what blocks it, so the UI need not look it up. */
  blockingProductName: string | null;
};

/**
 * Mirrors `projectPortfolioUpdateShape`. Every key is optional and only the
 * ones present are written, so the portal can save one section at a time.
 */
export type PortfolioInput = {
  visibility?: Visibility;
  featured?: boolean;
  sortOrder?: number;
  category?: string;
  tagline?: string;
  overview?: string;
  liveUrl?: string | null;
  featureCards?: unknown[];
  keyModules?: unknown[];
  headlineMetric?: unknown;
  testimonial?: unknown;
  demoVideo?: unknown;
  caseStudies?: unknown[];
  techStackKeys?: string[];
  platformKeys?: string[];
  appIconMediaKey?: string | null;
  heroAssetId?: string | null;
  ogAssetId?: string | null;
};

/** Everything this path may write, as dotted keys under `portfolio`. */
const WRITABLE_FIELDS = [
  'visibility',
  'featured',
  'sortOrder',
  'category',
  'tagline',
  'overview',
  'liveUrl',
  'featureCards',
  'keyModules',
  'headlineMetric',
  'testimonial',
  'demoVideo',
  'caseStudies',
  'techStackKeys',
  'platformKeys',
  'appIconMediaKey',
  'heroAssetId',
  'ogAssetId',
] as const satisfies ReadonlyArray<keyof PortfolioInput>;

export async function updateProjectPortfolio(
  projectId: string,
  input: PortfolioInput,
): Promise<PortfolioUpdateResult> {
  // Throws if the project is not there, before anything is written.
  await getProject(projectId);

  if (input.heroAssetId) {
    await assertHeroBelongsToProject(projectId, input.heroAssetId);
  }

  // Only the portfolio subtree, key by key — a whole-object set would wipe
  // `publishedAt`, which this path must never touch. Driving it from a list
  // rather than a line per field means a field added to the shared schema is
  // one edit, not two that can drift.
  const patch: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (input[field] !== undefined) patch[`portfolio.${field}`] = input[field];
  }

  await ProjectModel.updateOne({ _id: projectId }, { $set: patch });

  const updated = await getProject(projectId);

  return { project: updated, ...(await publishVerdict(updated)) };
}

/**
 * The gate verdict for a project as it stands, and the product's name when the
 * product is what blocks it.
 *
 * The save and the preview both answer with this, so it is worked out in one
 * place. `checkPublishGates` is the one implementation of the three gates
 * (CLAUDE.md §8) — this calls it and never re-derives the comparison.
 */
async function publishVerdict(project: ProjectDocument): Promise<{
  publishState: ReturnType<typeof checkPublishGates>;
  blockingProductName: string | null;
}> {
  const product = await ProductModel.findById(project.productId).select('name ndaRestricted').lean();

  const publishState = checkPublishGates({
    // The hero is an asset-level concern; this verdict is about the project, so
    // the asset gate is reported as satisfied and WRM-041 covers the per-asset view.
    assetVisibility: 'public',
    projectVisibility: project.portfolio.visibility as Visibility,
    productNdaRestricted: product?.ndaRestricted ?? true,
  });

  return {
    publishState,
    blockingProductName: publishState.blockedBy.includes('product-nda-restricted')
      ? (product?.name ?? null)
      : null,
  };
}

/**
 * What `updateProjectPortfolio` would do with this payload, without doing it.
 *
 * Driven by the same `WRITABLE_FIELDS` list the save is driven by, so a preview
 * can never promise a field the save then ignores. A field sent with the value
 * it already holds is not a change and is left out — the plan is meant to show
 * what would move, not to restate the payload.
 *
 * The gate verdict comes back with it because "what would this do" has to
 * include "and it would still be private". Nothing here writes.
 */
export async function previewPortfolioUpdate(
  projectId: string,
  input: PortfolioInput,
): Promise<PortfolioUpdateDiff> {
  const project = await getProject(projectId);

  // The same refusal the save gives, at the same point in the flow. A preview
  // that came back clean on a payload the save would reject is worse than none.
  if (input.heroAssetId) {
    await assertHeroBelongsToProject(projectId, input.heroAssetId);
  }

  const stored = plain(project.toObject().portfolio) as Record<string, unknown>;

  const changes: ImportFieldChange[] = [];
  for (const field of WRITABLE_FIELDS) {
    const to = input[field];
    if (to === undefined || sameValue(stored[field], to)) continue;

    changes.push({ field, from: describe(stored[field]), to: describe(to) });
  }

  return { changes, ...(await publishVerdict(project)) };
}

/**
 * A stored value as plain JSON, so it can be compared against a request body.
 *
 * Mongoose hands back ObjectId and Date instances where the payload holds the
 * strings they serialise to. Round-tripping through JSON puts both sides in the
 * same shape, rather than teaching the comparison below about Mongoose's types.
 */
function plain(value: unknown): unknown {
  return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as unknown);
}

/** Deep equality, ignoring key order — the two sides are built by different code. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((entry, index) => sameValue(entry, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;

    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      if (!sameValue(left[key], right[key])) return false;
    }

    return true;
  }

  return false;
}

/** The fields worth showing first when an object has to be named on one line. */
const LABEL_KEYS = ['title', 'label', 'value', 'quote', 'slug', 'provider'] as const;

/** As much of a value as stays readable on a line. Past this it is a wall, not a plan. */
const MAX_DESCRIPTION = 160;

function truncate(text: string): string {
  return text.length <= MAX_DESCRIPTION ? text : `${text.slice(0, MAX_DESCRIPTION - 1)}…`;
}

/** Names one entry — a card, a module, a case study — from whichever field it has. */
function labelOf(entry: unknown, take: number): string {
  if (typeof entry === 'string') return entry;
  if (entry === null || typeof entry !== 'object') return String(entry);

  const row = entry as Record<string, unknown>;
  const parts: string[] = [];

  for (const key of LABEL_KEYS) {
    const value = row[key];
    if (typeof value === 'string' && value.trim() !== '') parts.push(value.trim());
    if (parts.length === take) break;
  }

  return parts.length === 0 ? '(unnamed)' : parts.join(' — ');
}

/**
 * How a portfolio value reads on one line of a plan.
 *
 * These are not the scalars the feature importer diffs — a value here may be a
 * list of cards or a set of case studies. A count and the names is what tells
 * someone whether the change is the one they asked for; the whole object,
 * flattened onto one line, tells them nothing.
 */
function describe(value: unknown): string {
  if (value === null || value === undefined) return '(none)';

  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)';
    return truncate(`${value.length} × ${value.map((entry) => labelOf(entry, 1)).join(', ')}`);
  }

  if (typeof value === 'object') return truncate(labelOf(value, 2));
  if (value === '') return '(empty)';

  return truncate(String(value));
}

/** A hero has to be one of this project's own files. */
async function assertHeroBelongsToProject(projectId: string, assetId: string): Promise<void> {
  const asset = await AssetModel.findOne({ _id: assetId, projectId }).select('visibility').lean();

  if (!asset) {
    throw new ValidationError('That image does not belong to this project.', {
      heroAssetId: 'Pick one of this project’s own files.',
    });
  }
}

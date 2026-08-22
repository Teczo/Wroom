import { checkPublishGates, type Visibility } from '@wroom/shared';

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
  const product = await ProductModel.findById(updated.productId).select('name ndaRestricted').lean();

  // The one gate implementation, called — never re-derived here.
  const publishState = checkPublishGates({
    // The hero is an asset-level concern; this verdict is about the project, so
    // the asset gate is reported as satisfied and WRM-041 covers the per-asset view.
    assetVisibility: 'public',
    projectVisibility: updated.portfolio.visibility as Visibility,
    productNdaRestricted: product?.ndaRestricted ?? true,
  });

  return {
    project: updated,
    publishState,
    blockingProductName: publishState.blockedBy.includes('product-nda-restricted')
      ? (product?.name ?? null)
      : null,
  };
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

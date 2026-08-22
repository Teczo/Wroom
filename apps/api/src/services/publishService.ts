import {
  PUBLISH_GATE_MESSAGES,
  isAssetPublishable,
  isProjectPublishable,
  type Visibility,
} from '@wroom/shared';
import type { Types } from 'mongoose';

import { AssetModel, type AssetDocument } from '../models/Asset.js';
import { EnvironmentModel } from '../models/Environment.js';
import { ProductModel } from '../models/Product.js';
import { PublishedProjectModel, type PublishedProjectDocument } from '../models/PublishedProject.js';
import type { ProjectDocument } from '../models/Project.js';
import type { UserDocument } from '../models/User.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';
import { getProject } from './projectService.js';

/**
 * Publishing is an explicit action, never a side effect of saving.
 *
 * It writes a flattened snapshot into `publishedProjects` — the only collection
 * the public API reads. Nothing here copies an account, a cost, an internal URL
 * or a private asset, so a bug in the public API cannot leak one.
 */

/**
 * The case study the v0.1 snapshot shape expects, taken from the first entry of
 * the v0.2 array. A project with none publishes empty prose, which is what an
 * unwritten case study did before.
 */
function firstCaseStudy(project: ProjectDocument) {
  const study = project.portfolio.caseStudies?.[0];

  return {
    problem: study?.problem ?? '',
    role: study?.role ?? '',
    approach: study?.approach ?? '',
    outcome: study?.outcome ?? '',
    metrics: study?.metrics ?? [],
    testimonial: study?.testimonial ?? null,
  };
}

function flattenTechStack(project: ProjectDocument): string[] {
  const { frontend, backend, database, other } = project.techStack;
  return [...frontend, ...backend, ...database, ...other].filter(Boolean);
}

/** Platforms come from the schema-driven details when the project type has them. */
function readPlatforms(project: ProjectDocument): string[] {
  const value = (project.details as Record<string, unknown>).targetPlatforms;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function toGalleryItem(asset: AssetDocument) {
  return {
    url: asset.blobUrl,
    thumbnailUrl: asset.thumbnailUrl,
    caption: asset.caption,
    kind: asset.kind,
    device: asset.device,
  };
}

export async function publishProject(
  projectId: string,
  user: UserDocument,
): Promise<PublishedProjectDocument> {
  const project = await getProject(projectId);
  const product = await ProductModel.findById(project.productId).lean();

  if (!product) {
    throw new UnprocessableError('This project has no product, so it cannot be published.');
  }

  const projectVisibility = project.portfolio.visibility as Visibility;

  if (!isProjectPublishable({ projectVisibility, productNdaRestricted: product.ndaRestricted })) {
    const reasons: string[] = [];
    if (projectVisibility !== 'public') reasons.push(PUBLISH_GATE_MESSAGES['project-not-public']);
    if (product.ndaRestricted) reasons.push(PUBLISH_GATE_MESSAGES['product-nda-restricted']);

    throw new UnprocessableError('This project cannot be published yet.', { reasons });
  }

  // The same three gates decide every asset — one shared function, never inlined.
  const assets = await AssetModel.find({ projectId: project._id }).sort({
    sortOrder: 1,
    createdAt: 1,
  });

  const publishable = assets.filter((asset) =>
    isAssetPublishable({
      assetVisibility: asset.visibility as Visibility,
      projectVisibility,
      productNdaRestricted: product.ndaRestricted,
    }),
  );

  const heroAsset =
    publishable.find((asset) => String(asset._id) === String(project.portfolio.heroAssetId)) ??
    publishable.find((asset) => asset.kind === 'screenshot') ??
    publishable[0];

  const primaryEnvironment = await EnvironmentModel.findOne({
    projectId: project._id,
    isPrimary: true,
  })
    .select('publicUrl')
    .lean();

  const publishedAt = new Date();
  const existing = await PublishedProjectModel.findOne({ projectId: project._id });

  const snapshot = {
    projectId: project._id as Types.ObjectId,
    slug: project.slug,
    name: project.name,
    shortDescription: project.shortDescription,
    productName: product.name,
    // The snapshot still carries one case study; `publishedProjects` is
    // WRM-083's to reshape. Reading the first entry keeps this path doing
    // exactly what it did when the source was a single object.
    caseStudy: firstCaseStudy(project),
    techStack: flattenTechStack(project),
    liveUrl: primaryEnvironment?.publicUrl ?? null,
    platforms: readPlatforms(project),
    heroImage: heroAsset ? { url: heroAsset.blobUrl, alt: heroAsset.altText } : null,
    gallery: publishable
      .filter((asset) => String(asset._id) !== String(heroAsset?._id))
      .map(toGalleryItem),
    status: project.status,
    startedAt: project.startedAt,
    launchedAt: project.launchedAt,
    featured: project.portfolio.featured,
    sortOrder: existing?.sortOrder ?? 0,
    publishedAt,
    publishedByUserId: user._id as Types.ObjectId,
  };

  const published = await PublishedProjectModel.findOneAndUpdate(
    { projectId: project._id },
    { $set: snapshot },
    { new: true, upsert: true },
  );

  project.set({ 'portfolio.publishedAt': publishedAt });
  await project.save();

  return published;
}

/** Removes the snapshot. The operational record is untouched. */
export async function unpublishProject(projectId: string): Promise<void> {
  const project = await getProject(projectId);

  const deleted = await PublishedProjectModel.findOneAndDelete({ projectId: project._id });
  if (!deleted) throw new NotFoundError('A published version of this project');

  project.set({ 'portfolio.publishedAt': null });
  await project.save();
}

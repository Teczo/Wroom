import {
  ASSET_VARIANT_NAMES,
  PUBLISH_GATE_MESSAGES,
  checkPublishGates,
  isAssetPublishable,
  type AssetVariantName,
  type Visibility,
} from '@wroom/shared';
import type { Types } from 'mongoose';

import { AssetModel, type AssetDocument } from '../models/Asset.js';
import { ProductModel } from '../models/Product.js';
import { PublishedProjectModel, type PublishedProjectDocument } from '../models/PublishedProject.js';
import type { ProjectDocument } from '../models/Project.js';
import type { UserDocument } from '../models/User.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';
import { copyToPublic, removeFromPublic } from './assetService.js';
import { generateOgCrop, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from './imageVariantService.js';
import { resolveClientMark, resolveMarks } from './mediaLibraryService.js';
import { getProject } from './projectService.js';
import {
  blobNameFromUrl,
  deletePublicBlob,
  downloadBlob,
  publicBlobNameFor,
  publicBlobNameFromUrl,
  uploadPublicBlob,
} from './uploadService.js';

/**
 * Publishing is an explicit action, never a side effect of saving.
 *
 * The order is the point (docs/DATA_MODEL.md, "Publishing"):
 *
 *   1. run the three gates, failing closed
 *   2. copy every publishable blob into the public container
 *   3. resolve the mediaLibrary keys, dropping anything not usage-approved
 *   4. write the flattened snapshot, using public URLs only
 *
 * Unpublishing reverses step 2 before undoing step 4. Deleting the row while the
 * blobs remain leaves a permanently cacheable public URL for content nobody
 * publishes any more — the blob delete is what actually revokes access.
 *
 * Nothing here copies an account, a cost, an environment URL or a private asset,
 * so a bug in the public API cannot leak one.
 */

type PublicVariants = Partial<Record<AssetVariantName, string | null>>;

type StoredVariant = { url?: string } | null | undefined;

/**
 * The public URLs of an asset's three variants.
 *
 * Read by name rather than enumerated: `publicVariants` is a Mongoose nested
 * document, and iterating one with `Object.values` returns its internals.
 */
function publicVariantsOf(asset: AssetDocument): PublicVariants | null {
  const source = asset.publicVariants as Record<string, StoredVariant> | null | undefined;
  if (!source) return null;

  const variants: PublicVariants = {};
  let found = false;

  for (const name of ASSET_VARIANT_NAMES) {
    const url = source[name]?.url ?? null;
    variants[name] = url;
    if (url) found = true;
  }

  return found ? variants : null;
}

/**
 * An asset as an image in the snapshot, or null.
 *
 * Null when the asset was never copied out. That is the fail-closed reading: a
 * missing public copy means the bytes are not in the public container, so there
 * is no URL that would load anyway.
 */
function toImage(asset: AssetDocument | undefined, alt?: string) {
  if (!asset?.publicBlobUrl) return null;

  return {
    url: asset.publicBlobUrl,
    alt: alt ?? asset.altText,
    variants: publicVariantsOf(asset),
  };
}

function toGalleryItem(asset: AssetDocument) {
  return {
    url: asset.publicBlobUrl as string,
    variants: publicVariantsOf(asset),
    caption: asset.caption,
    kind: asset.kind,
    device: asset.device,
    alt: asset.altText,
  };
}

/**
 * The OG card's URL.
 *
 * A project may name its own `ogAssetId`, already 1200x630 and already copied
 * out with everything else. When it does not, the hero is cropped to the card
 * size at publish time and that crop is written straight into the public
 * container — it is derived from a blob that has already passed the gates, so
 * it is publishable by the same reasoning.
 *
 * The crop belongs to no asset record, so the snapshot's `ogImage.url` is the
 * only handle on it. Unpublishing reads the URL back to delete it.
 */
async function buildOgImage(
  project: ProjectDocument,
  ogAsset: AssetDocument | undefined,
  heroAsset: AssetDocument | undefined,
): Promise<{ url: string; width: number; height: number } | null> {
  if (ogAsset?.publicBlobUrl) {
    return { url: ogAsset.publicBlobUrl, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT };
  }

  const heroName = heroAsset?.blobName ?? (heroAsset ? blobNameFromUrl(heroAsset.blobUrl) : null);
  if (!heroName) return null;

  const original = await downloadBlob(heroName);
  const crop = await generateOgCrop(original);

  // Salted with the project id rather than an asset id: this crop is the
  // project's, not any one asset's, and two projects cropping the same hero
  // must not share a blob that unpublishing either would delete.
  const blobName = publicBlobNameFor(String(project._id), crop.buffer, crop.contentType);
  const url = await uploadPublicBlob(blobName, crop.buffer, crop.contentType);

  return { url, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT };
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

  // --- 1. the three gates -------------------------------------------------
  // The one implementation, called. `blockedBy` is what it already worked out,
  // so the refusal message is a lookup rather than the same comparison written
  // a second time.
  const projectGate = checkPublishGates({
    // The project's own eligibility is being decided here; the asset gate is
    // applied per asset below.
    assetVisibility: 'public',
    projectVisibility,
    productNdaRestricted: product.ndaRestricted,
  });

  if (!projectGate.publishable) {
    throw new UnprocessableError('This project cannot be published yet.', {
      reasons: projectGate.blockedBy.map((reason) => PUBLISH_GATE_MESSAGES[reason]),
    });
  }

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

  // --- 2. copy every publishable blob into the public container -----------
  // Before anything is written, so the snapshot can only ever name URLs that
  // already resolve. `copyToPublic` re-checks the gates itself.
  for (const asset of publishable) {
    await copyToPublic(String(asset._id));
  }

  // Re-read: copyToPublic saved publicBlobUrl and publicVariants onto each
  // document, and the copies in `publishable` are the versions from before.
  const copied = await AssetModel.find({ _id: { $in: publishable.map((asset) => asset._id) } });
  const byId = new Map(copied.map((asset) => [String(asset._id), asset]));
  const ordered = publishable.flatMap((asset) => {
    const fresh = byId.get(String(asset._id));
    return fresh ? [fresh] : [];
  });

  const find = (id: unknown): AssetDocument | undefined =>
    id ? byId.get(String(id)) : undefined;

  const heroAsset =
    find(project.portfolio.heroAssetId) ??
    ordered.find((asset) => asset.kind === 'screenshot') ??
    ordered[0];

  // --- 3. resolve the mediaLibrary keys -----------------------------------
  // Anything not usage-approved is dropped here, and the publish carries on.
  const [techStack, platforms, appIcons, clientLogo] = await Promise.all([
    resolveMarks(project.portfolio.techStackKeys ?? []),
    resolveMarks(project.portfolio.platformKeys ?? []),
    // One key at most, and it resolves to nothing when the mark is missing or
    // was never usage-approved — the project publishes without an icon rather
    // than failing, which is what every other mark here does.
    resolveMarks(project.portfolio.appIconMediaKey ? [project.portfolio.appIconMediaKey] : []),
    resolveClientMark(product.clientMediaKey),
  ]);

  const iconKeys = (project.portfolio.featureCards ?? [])
    .map((card) => card.iconKey)
    .filter((key): key is string => Boolean(key));
  const iconsByKey = new Map((await resolveMarks(iconKeys)).map((mark) => [mark.key, mark]));

  const ogImage = await buildOgImage(project, find(project.portfolio.ogAssetId), heroAsset);

  // --- 4. write the flattened snapshot, public URLs only -------------------
  const publishedAt = new Date();
  const existing = await PublishedProjectModel.findOne({ projectId: project._id });

  const demoVideo = project.portfolio.demoVideo;
  const demoVideoAsset = find(demoVideo?.assetId);
  const demoPoster = find(demoVideo?.posterAssetId);

  const snapshot = {
    projectId: project._id as Types.ObjectId,
    slug: project.slug,
    name: project.name,
    productName: product.name,

    category: project.portfolio.category,
    tagline: project.portfolio.tagline,
    overview: project.portfolio.overview,
    shortDescription: project.shortDescription,

    // Authored on the project. The primary environment's `publicUrl` is
    // operational and is never snapshotted (docs/DATA_MODEL.md).
    liveUrl: project.portfolio.liveUrl ?? null,

    featureCards: (project.portfolio.featureCards ?? []).map((card) => {
      const icon = card.iconKey ? iconsByKey.get(card.iconKey) : undefined;
      return {
        icon: icon ? { svg: icon.svg, label: icon.label } : null,
        title: card.title,
        body: card.body,
      };
    }),
    keyModules: (project.portfolio.keyModules ?? []).map((module) => ({
      title: module.title,
      body: module.body,
    })),
    headlineMetric: project.portfolio.headlineMetric
      ? {
          value: project.portfolio.headlineMetric.value,
          label: project.portfolio.headlineMetric.label,
        }
      : null,
    testimonial: project.portfolio.testimonial
      ? {
          quote: project.portfolio.testimonial.quote,
          attribution: project.portfolio.testimonial.attribution,
        }
      : null,

    demoVideo: demoVideo
      ? {
          provider: demoVideo.provider,
          url: demoVideoAsset?.publicBlobUrl ?? null,
          externalId: demoVideo.externalId ?? null,
          poster: toImage(demoPoster),
        }
      : null,

    caseStudies: (project.portfolio.caseStudies ?? []).map((study) => ({
      slug: study.slug,
      sector: study.sector,
      title: study.title,
      summary: study.summary,
      hero: toImage(find(study.heroAssetId)),
      problem: study.problem,
      role: study.role,
      approach: study.approach,
      outcome: study.outcome,
      metrics: study.metrics.map((metric) => ({ label: metric.label, value: metric.value })),
      testimonial: study.testimonial
        ? { quote: study.testimonial.quote, attribution: study.testimonial.attribution }
        : null,
      sortOrder: study.sortOrder,
    })),

    techStack,
    platforms,
    appIcon: appIcons[0] ?? null,
    clientLogo,

    heroImage: toImage(heroAsset),
    ogImage,
    gallery: ordered
      .filter((asset) => String(asset._id) !== String(heroAsset?._id))
      .filter((asset) => Boolean(asset.publicBlobUrl))
      .map(toGalleryItem),

    status: project.status,
    startedAt: project.startedAt,
    launchedAt: project.launchedAt,
    featured: project.portfolio.featured,
    sortOrder: project.portfolio.sortOrder ?? existing?.sortOrder ?? 0,
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

/**
 * Takes a project off the public site.
 *
 * Blobs first, row second. A row removed while the copies remain leaves a
 * public URL that still loads — and a cacheable one, so it may keep loading for
 * a long time after. Deleting the bytes is the operation that revokes access;
 * removing the row only stops anything linking to them.
 */
export async function unpublishProject(projectId: string): Promise<void> {
  const project = await getProject(projectId);

  const existing = await PublishedProjectModel.findOne({ projectId: project._id });
  if (!existing) throw new NotFoundError('A published version of this project');

  // The generated OG card belongs to no asset, so the snapshot's URL is the
  // only record of it. Read it before the row goes.
  const generatedOg = existing.ogImage?.url ? publicBlobNameFromUrl(existing.ogImage.url) : null;

  // --- reverse step 2 -----------------------------------------------------
  const assets = await AssetModel.find({ projectId: project._id, publicBlobName: { $ne: null } });
  for (const asset of assets) {
    await removeFromPublic(String(asset._id));
  }

  if (generatedOg) await deletePublicBlob(generatedOg);

  // --- and only then the row ----------------------------------------------
  await PublishedProjectModel.deleteOne({ _id: existing._id });

  project.set({ 'portfolio.publishedAt': null });
  await project.save();
}

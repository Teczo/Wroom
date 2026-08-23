import {
  ASSET_VARIANT_NAMES,
  PUBLISH_GATE_MESSAGES,
  VARIANT_ASSET_KINDS,
  checkPublishGates,
  type AssetVariantName,
  type Infer,
  type Visibility,
  type assetCreateShape,
} from '@wroom/shared';
import type { Types } from 'mongoose';

import { AssetModel, type AssetDocument } from '../models/Asset.js';
import { ProductModel } from '../models/Product.js';
import type { UserDocument } from '../models/User.js';
import { ForbiddenError, NotFoundError, UnprocessableError, ValidationError } from '../utils/errors.js';
import { NotAnImageError, generateVariants, measureOriginal } from './imageVariantService.js';
import { getProject } from './projectService.js';
import {
  blobNameFromUrl,
  deleteBlobByUrl,
  deletePrivateBlob,
  deletePublicBlob,
  derivedBlobName,
  downloadBlob,
  publicBlobNameFor,
  resolveUploadedBlob,
  uploadDerivedBlob,
  uploadPublicBlob,
} from './uploadService.js';

type AssetInput = Infer<typeof assetCreateShape>;

/** An asset plus why it would or would not reach the portfolio. */
export type AssetWithPublishState = Record<string, unknown> & {
  publishState: ReturnType<typeof checkPublishGates>;
};

/**
 * The other two gates are the same for every asset on a project, so they are
 * read once and the shared gate function is called per asset. Nothing here
 * re-implements the three-condition check.
 */
async function projectGates(projectId: string): Promise<{
  projectVisibility: Visibility;
  productNdaRestricted: boolean;
}> {
  const project = await getProject(projectId);
  const product = await ProductModel.findById(project.productId).select('ndaRestricted').lean();

  return {
    projectVisibility: project.portfolio.visibility as Visibility,
    // No product found is treated as restricted: fail closed, never open.
    productNdaRestricted: product?.ndaRestricted ?? true,
  };
}

export async function listAssets(
  projectId: string,
  filters: { kind?: string; visibility?: string },
): Promise<AssetWithPublishState[]> {
  const gates = await projectGates(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.kind) query.kind = filters.kind;
  if (filters.visibility) query.visibility = filters.visibility;

  const items = await AssetModel.find(query).sort({ sortOrder: 1, createdAt: -1 });

  return items.map((asset) => ({
    ...(asset.toJSON() as Record<string, unknown>),
    publishState: checkPublishGates({
      ...gates,
      assetVisibility: asset.visibility as Visibility,
    }),
  }));
}

/**
 * Writes a whole ordering in one request, spaced by 1000 so a later insert has
 * somewhere to go. Ids that are not on this project are ignored rather than
 * silently reordering somebody else's assets.
 */
export async function reorderAssets(projectId: string, assetIds: string[]): Promise<number> {
  await getProject(projectId);

  const owned = await AssetModel.find({ projectId, _id: { $in: assetIds } }).select('_id');
  const ownedIds = new Set(owned.map((asset) => String(asset._id)));
  const ordered = assetIds.filter((id) => ownedIds.has(id));

  if (ordered.length === 0) return 0;

  await AssetModel.bulkWrite(
    ordered.map((id, index) => ({
      updateOne: {
        filter: { _id: id, projectId },
        update: { $set: { sortOrder: (index + 1) * ASSET_ORDER_GAP } },
      },
    })),
  );

  return ordered.length;
}

const ASSET_ORDER_GAP = 1000;

export async function getAsset(projectId: string, id: string): Promise<AssetDocument> {
  const asset = await AssetModel.findOne({ _id: id, projectId });
  if (!asset) throw new NotFoundError('That asset');
  return asset;
}

/**
 * Registers an uploaded blob.
 *
 * The URL is rebuilt from the `blobName` the API issued and checked to exist,
 * rather than taken from the request — the client never says where a record
 * points. Visibility is not read from the body at all: an asset is private
 * when it is created, and only WRM-041 will change that.
 */
export async function createAsset(
  projectId: string,
  input: AssetInput,
  user: UserDocument,
): Promise<AssetDocument> {
  await getProject(projectId);

  const { blobName, ...fields } = input;
  const blobUrl = await resolveUploadedBlob(projectId, blobName);

  // Resizing happens before the record is written, so a file that turns out not
  // to be an image is a 422 with nothing created, rather than a half-made asset.
  const derived = wantsVariants(input.kind, input.mimeType)
    ? await buildVariants(blobName)
    : null;

  return AssetModel.create({
    ...fields,
    // Measured off the bytes for anything resizable. For video and documents
    // there is no server-side measurement to make, so what the client sent is
    // all there is — it is never used to decide a variant width either way.
    ...(derived ? { width: derived.width, height: derived.height } : {}),
    blobName,
    blobUrl,
    variants: derived?.variants ?? null,
    thumbnailUrl: null,
    visibility: 'private',
    projectId,
    uploadedByUserId: user._id as Types.ObjectId,
  });
}

/** Kinds and formats worth resizing. See VARIANT_ASSET_KINDS for the reasoning. */
export function wantsVariants(kind: string, mimeType: string): boolean {
  return (
    (VARIANT_ASSET_KINDS as readonly string[]).includes(kind) &&
    mimeType.startsWith('image/') &&
    mimeType !== 'image/svg+xml'
  );
}

export type VariantSet = Partial<
  Record<AssetVariantName, { blobName: string; url: string; width: number }>
>;

/**
 * Reads the original back out of the private container, resizes it, and stores
 * the three copies alongside it.
 *
 * The download is what makes this possible at all: uploads go straight from the
 * browser to Azure on a signed URL, so this is the first moment the server has
 * the bytes in hand.
 */
async function buildVariants(
  originalBlobName: string,
): Promise<{ width: number; height: number; variants: VariantSet }> {
  const original = await downloadBlob(originalBlobName);

  let measurements;
  let generated;
  try {
    measurements = await measureOriginal(original);
    generated = await generateVariants(original);
  } catch (error: unknown) {
    if (error instanceof NotAnImageError) {
      throw new UnprocessableError(error.message, {
        blobName: 'This file is not an image the server can resize.',
      });
    }
    throw error;
  }

  const variants: VariantSet = {};

  for (const variant of generated) {
    const name = derivedBlobName(originalBlobName, variant.name);
    variants[variant.name] = {
      blobName: name,
      url: await uploadDerivedBlob(name, variant.buffer, variant.contentType),
      width: variant.width,
    };
  }

  return { ...measurements, variants };
}

/**
 * Generates and stores the variants for one asset that has none.
 *
 * Returns what it did, so the backfill can report rather than guess. The
 * `variants` guard is what makes a second run cheap: an asset that already has
 * them is not downloaded, not resized and not written.
 */
export async function backfillVariantsFor(
  asset: AssetDocument,
): Promise<'generated' | 'skipped'> {
  if (asset.variants) return 'skipped';
  if (!wantsVariants(asset.kind, asset.mimeType)) return 'skipped';

  const originalName = asset.blobName ?? blobNameFromUrl(asset.blobUrl);
  if (!originalName) {
    throw new ValidationError('That asset does not point at a file in our storage.', {
      blobUrl: 'The private blob could not be located, so there is nothing to resize.',
    });
  }

  const derived = await buildVariants(originalName);

  asset.set({
    // Older records predate `blobName`; now that one has been worked out, keep it.
    blobName: originalName,
    width: derived.width,
    height: derived.height,
    variants: derived.variants,
  });
  await asset.save();

  return 'generated';
}

type StoredVariant = { blobName?: string; url?: string; width?: number };

/**
 * Reads the three variants off a stored set, by name.
 *
 * Indexed rather than enumerated on purpose: `variants` is a Mongoose nested
 * document, and iterating one with `Object.values` hands back its internals
 * rather than the three keys. Asking for the names we know is both correct and
 * the only place they need listing.
 */
function storedVariants(
  set: unknown,
): Array<{ name: AssetVariantName; variant: StoredVariant }> {
  if (!set) return [];

  const source = set as Record<string, StoredVariant | null | undefined>;

  return ASSET_VARIANT_NAMES.flatMap((name) => {
    const variant = source[name];
    return variant?.blobName ? [{ name, variant }] : [];
  });
}

/** Every private blob an asset owns: the original and any variants. */
function privateBlobNames(asset: AssetDocument): string[] {
  const original = asset.blobName ?? blobNameFromUrl(asset.blobUrl);
  const variants = storedVariants(asset.variants).map((entry) => entry.variant.blobName as string);

  return original ? [original, ...variants] : variants;
}

/** Every public blob an asset owns, if it has been copied out. */
function publicBlobNames(asset: AssetDocument): string[] {
  const variants = storedVariants(asset.publicVariants).map(
    (entry) => entry.variant.blobName as string,
  );

  return asset.publicBlobName ? [asset.publicBlobName, ...variants] : variants;
}

/**
 * Copies an asset and its variants into the public container.
 *
 * The three gates are checked here rather than trusted to the caller. This is
 * the only function in the system that writes to a container the whole internet
 * can read, and a gate that lives at the call site is a gate that the next call
 * site forgets (CLAUDE.md §8). WRM-083 wires this into the publish action; it
 * does not get to skip the check by calling it directly.
 *
 * Deterministic: copying twice writes the same names and leaves the same URLs,
 * so a republish is not a pile of orphans.
 */
export async function copyToPublic(assetId: string): Promise<AssetDocument> {
  const asset = await AssetModel.findById(assetId);
  if (!asset) throw new NotFoundError('That asset');

  const gates = await projectGates(String(asset.projectId));
  const state = checkPublishGates({ ...gates, assetVisibility: asset.visibility as Visibility });

  if (!state.publishable) {
    throw new ForbiddenError(
      state.blockedBy.map((reason) => PUBLISH_GATE_MESSAGES[reason]).join(' '),
    );
  }

  const originalName = asset.blobName ?? blobNameFromUrl(asset.blobUrl);
  if (!originalName) {
    throw new ValidationError('That asset does not point at a file in our storage.', {
      blobUrl: 'The private blob could not be located, so there is nothing to copy.',
    });
  }

  const original = await downloadBlob(originalName);
  const publicName = publicBlobNameFor(assetId, original, asset.mimeType);
  const publicUrl = await uploadPublicBlob(publicName, original, asset.mimeType);

  const publicVariants: VariantSet = {};

  for (const { name, variant } of storedVariants(asset.variants)) {
    const body = await downloadBlob(variant.blobName as string);
    const variantPublicName = publicBlobNameFor(assetId, body, 'image/webp');

    publicVariants[name] = {
      blobName: variantPublicName,
      url: await uploadPublicBlob(variantPublicName, body, 'image/webp'),
      width: variant.width ?? 0,
    };
  }

  asset.set({
    publicBlobName: publicName,
    publicBlobUrl: publicUrl,
    publicVariants: Object.keys(publicVariants).length > 0 ? publicVariants : null,
  });
  await asset.save();

  return asset;
}

/**
 * Removes an asset's public copies.
 *
 * The blobs go first and the record is updated second, deliberately. Deleting
 * the blob is what actually revokes access — clearing the fields only stops the
 * URL being linked to, and a URL that has been cached or copied still resolves
 * until the bytes are gone (CLAUDE.md §8). If a delete fails, the fields stay
 * put and the asset still says where its copies are.
 */
export async function removeFromPublic(assetId: string): Promise<AssetDocument> {
  const asset = await AssetModel.findById(assetId);
  if (!asset) throw new NotFoundError('That asset');

  for (const name of publicBlobNames(asset)) {
    await deletePublicBlob(name);
  }

  asset.set({ publicBlobName: null, publicBlobUrl: null, publicVariants: null });
  await asset.save();

  return asset;
}

/**
 * Marking an asset public makes it *eligible* for the portfolio, nothing more.
 * The response carries the gate result so the caller can be told when the
 * project or the product still blocks it — which is common, and silent
 * otherwise.
 */
export async function updateAsset(
  projectId: string,
  id: string,
  input: Partial<AssetInput>,
): Promise<{ asset: AssetDocument; publishState: ReturnType<typeof checkPublishGates> }> {
  const asset = await getAsset(projectId, id);
  asset.set(input);
  await asset.save();

  const gates = await projectGates(projectId);

  return {
    asset,
    publishState: checkPublishGates({
      ...gates,
      assetVisibility: asset.visibility as Visibility,
    }),
  };
}

/**
 * Takes the files with it — a record removed but a blob left behind is a leak.
 *
 * That now means four private blobs rather than one, and any public copies on
 * top. The public ones go first: those are the only ones reachable without a
 * signature, so they are the ones that matter if anything later fails.
 */
export async function deleteAsset(projectId: string, id: string): Promise<void> {
  const asset = await getAsset(projectId, id);

  for (const name of publicBlobNames(asset)) {
    await deletePublicBlob(name);
  }

  for (const name of privateBlobNames(asset)) {
    await deletePrivateBlob(name);
  }

  // Covers an older record whose blobName could not be derived from its URL.
  await deleteBlobByUrl(asset.blobUrl);
  await asset.deleteOne();
}

/**
 * Why an asset would or would not reach the portfolio. The portal shows this so
 * "why isn't my screenshot showing" has an answer without guesswork.
 */
export async function explainPublishState(
  projectId: string,
  id: string,
): Promise<ReturnType<typeof checkPublishGates>> {
  const [asset, gates] = await Promise.all([getAsset(projectId, id), projectGates(projectId)]);

  return checkPublishGates({ ...gates, assetVisibility: asset.visibility as Visibility });
}

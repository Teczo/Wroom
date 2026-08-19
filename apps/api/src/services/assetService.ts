import { checkPublishGates, type Infer, type Visibility, type assetCreateShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { AssetModel, type AssetDocument } from '../models/Asset.js';
import { ProductModel } from '../models/Product.js';
import type { UserDocument } from '../models/User.js';
import { NotFoundError } from '../utils/errors.js';
import { getProject } from './projectService.js';
import { deleteBlobByUrl, resolveUploadedBlob } from './uploadService.js';

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

  return AssetModel.create({
    ...fields,
    blobUrl,
    thumbnailUrl: null,
    visibility: 'private',
    projectId,
    uploadedByUserId: user._id as Types.ObjectId,
  });
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

/** Takes the file with it — a record removed but a blob left behind is a leak. */
export async function deleteAsset(projectId: string, id: string): Promise<void> {
  const asset = await getAsset(projectId, id);

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

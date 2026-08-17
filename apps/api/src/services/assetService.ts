import { checkPublishGates, type Infer, type Visibility, type assetCreateShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { AssetModel, type AssetDocument } from '../models/Asset.js';
import { ProductModel } from '../models/Product.js';
import type { UserDocument } from '../models/User.js';
import { NotFoundError } from '../utils/errors.js';
import { getProject } from './projectService.js';

type AssetInput = Infer<typeof assetCreateShape>;

export async function listAssets(
  projectId: string,
  filters: { kind?: string; visibility?: string },
): Promise<AssetDocument[]> {
  await getProject(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.kind) query.kind = filters.kind;
  if (filters.visibility) query.visibility = filters.visibility;

  return AssetModel.find(query).sort({ sortOrder: 1, createdAt: -1 });
}

export async function getAsset(projectId: string, id: string): Promise<AssetDocument> {
  const asset = await AssetModel.findOne({ _id: id, projectId });
  if (!asset) throw new NotFoundError('That asset');
  return asset;
}

/** Registers an uploaded blob. New assets are private until explicitly changed. */
export async function createAsset(
  projectId: string,
  input: AssetInput,
  user: UserDocument,
): Promise<AssetDocument> {
  await getProject(projectId);

  return AssetModel.create({
    ...input,
    projectId,
    uploadedByUserId: user._id as Types.ObjectId,
  });
}

export async function updateAsset(
  projectId: string,
  id: string,
  input: Partial<AssetInput>,
): Promise<AssetDocument> {
  const asset = await getAsset(projectId, id);
  asset.set(input);
  await asset.save();
  return asset;
}

export async function deleteAsset(projectId: string, id: string): Promise<void> {
  const asset = await getAsset(projectId, id);
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
  const [asset, project] = await Promise.all([
    getAsset(projectId, id),
    getProject(projectId),
  ]);

  const product = await ProductModel.findById(project.productId).select('ndaRestricted').lean();

  return checkPublishGates({
    assetVisibility: asset.visibility as Visibility,
    projectVisibility: project.portfolio.visibility as Visibility,
    productNdaRestricted: product?.ndaRestricted ?? true,
  });
}

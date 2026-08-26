import { ASSET_KINDS, VISIBILITIES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * One resized copy. `width` is what came out, not what was asked for — a small
 * original is never upscaled, so a 500px image gives a 400px thumb and a 500px
 * card rather than three blurry enlargements.
 */
const variantSchema = new Schema(
  {
    blobName: { type: String, required: true },
    url: { type: String, required: true },
    width: { type: Number, required: true },
  },
  { _id: false },
);

/**
 * The set of three. Null as a whole for video and document kinds, where there is
 * nothing to resize.
 */
const variantSetSchema = new Schema(
  {
    thumb: { type: variantSchema, default: null },
    card: { type: variantSchema, default: null },
    hero: { type: variantSchema, default: null },
  },
  { _id: false },
);

const assetSchema = new Schema(
  {
    /**
     * Null for a site asset — one that belongs to the portfolio's own pages
     * rather than to a project, such as the portrait. Those are gated by
     * `checkSiteAssetGates` rather than by the three, because there is no
     * project or product to read (CLAUDE.md §8).
     */
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    featureId: { type: Schema.Types.ObjectId, ref: 'Feature', default: null },
    kind: { type: String, enum: ASSET_KINDS as unknown as string[], required: true },

    /**
     * The path inside the private container. Older records predate this field
     * and carry only `blobUrl`; the upload service derives one from the other,
     * so both shapes work.
     */
    blobName: { type: String, default: null },
    blobUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    durationSec: { type: Number, default: null },

    /** Written at upload from the original. Null for video and document. */
    variants: { type: variantSetSchema, default: null },

    /**
     * The public copies. Null until the publish action copies the blobs into the
     * public container, and nulled again when it removes them. A SAS-signed URL
     * must never appear in any of these three (CLAUDE.md §8).
     */
    publicBlobName: { type: String, default: null },
    publicBlobUrl: { type: String, default: null },
    publicVariants: { type: variantSetSchema, default: null },

    title: { type: String, default: '' },
    caption: { type: String, default: '' },
    altText: { type: String, default: '' },
    /** Useful for device framing in the portfolio. */
    device: { type: String, default: '' },
    /** Private by default — one of the three publish gates. */
    visibility: { type: String, enum: VISIBILITIES as unknown as string[], default: 'private' },
    sortOrder: { type: Number, default: 0 },

    capturedAt: { type: Date, default: null },
    uploadedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'assets' },
);

assetSchema.index({ projectId: 1, visibility: 1, sortOrder: 1 });

export type Asset = InferSchemaType<typeof assetSchema>;
export type AssetDocument = HydratedDocument<Asset>;

export const AssetModel = model('Asset', assetSchema);

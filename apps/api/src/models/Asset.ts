import { ASSET_KINDS, VISIBILITIES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const assetSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    featureId: { type: Schema.Types.ObjectId, ref: 'Feature', default: null },
    kind: { type: String, enum: ASSET_KINDS as unknown as string[], required: true },

    blobUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    durationSec: { type: Number, default: null },

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

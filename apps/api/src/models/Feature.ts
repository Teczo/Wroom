import {
  FEATURE_PRIORITIES,
  FEATURE_SIZES,
  FEATURE_SOURCES,
  FEATURE_STATUSES,
} from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const featureSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    /** Human-readable, used in branch names and PR titles. Unique per project. */
    ref: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    acceptanceCriteria: { type: String, default: '' },

    status: { type: String, enum: FEATURE_STATUSES as unknown as string[], default: 'backlog' },
    priority: { type: String, enum: FEATURE_PRIORITIES as unknown as string[], default: 'medium' },
    size: { type: String, enum: FEATURE_SIZES as unknown as string[], default: 'm' },
    /** Manual sort within a column, gaps of 1000. */
    order: { type: Number, default: 1000 },

    assigneeUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    labels: { type: [String], default: [] },
    dependsOnFeatureIds: { type: [Schema.Types.ObjectId], ref: 'Feature', default: [] },

    branch: { type: String, default: null },
    prUrl: { type: String, default: null },
    completedAt: { type: Date, default: null },
    blockedReason: { type: String, default: null },

    source: { type: String, enum: FEATURE_SOURCES as unknown as string[], default: 'manual' },
    /** Dedupe key for re-imports. */
    externalKey: { type: String, default: null },
  },
  { timestamps: true, collection: 'features' },
);

featureSchema.index({ projectId: 1, status: 1, order: 1 });
featureSchema.index({ projectId: 1, ref: 1 }, { unique: true });

export type Feature = InferSchemaType<typeof featureSchema>;
export type FeatureDocument = HydratedDocument<Feature>;

export const FeatureModel = model('Feature', featureSchema);

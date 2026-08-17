import { ENVIRONMENT_NAMES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const environmentSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, enum: ENVIRONMENT_NAMES as unknown as string[], required: true },
    branch: { type: String, default: 'main' },
    publicUrl: { type: String, default: null },
    /** The one shown on the project card. */
    isPrimary: { type: Boolean, default: false },
    healthCheckUrl: { type: String, default: null },
  },
  { timestamps: true, collection: 'environments' },
);

environmentSchema.index({ projectId: 1, name: 1 }, { unique: true });

export type Environment = InferSchemaType<typeof environmentSchema>;
export type EnvironmentDocument = HydratedDocument<Environment>;

export const EnvironmentModel = model('Environment', environmentSchema);

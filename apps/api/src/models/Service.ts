import { SERVICE_ROLES, SERVICE_STATUSES, VENDORS } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** A single hosted thing inside an environment. */
const serviceSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    environmentId: { type: Schema.Types.ObjectId, ref: 'Environment', required: true },
    role: { type: String, enum: SERVICE_ROLES as unknown as string[], required: true },
    vendor: { type: String, enum: VENDORS as unknown as string[], required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    resourceName: { type: String, required: true },
    region: { type: String, default: '' },
    url: { type: String, default: null },
    plan: { type: String, default: '' },
    status: { type: String, enum: SERVICE_STATUSES as unknown as string[], default: 'active' },
    /** How a vendor cost line is attributed back to this project automatically. */
    externalRef: { type: String, default: null },
  },
  { timestamps: true, collection: 'services' },
);

serviceSchema.index({ projectId: 1, environmentId: 1 });
serviceSchema.index({ accountId: 1 });

export type Service = InferSchemaType<typeof serviceSchema>;
export type ServiceDocument = HydratedDocument<Service>;

export const ServiceModel = model('Service', serviceSchema);

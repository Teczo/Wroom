import { CREDENTIAL_KINDS } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * A registry of where a key lives and when it expires. No secret value is ever
 * stored here — `storedIn` is a human-readable pointer such as "Azure Key Vault".
 */
const credentialSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    label: { type: String, required: true },
    kind: { type: String, enum: CREDENTIAL_KINDS as unknown as string[], required: true },
    storedIn: { type: String, required: true },
    expiresAt: { type: Date, default: null },
    renewalCostAud: { type: Number, default: 0 },
    alertDaysBefore: { type: Number, default: 30 },
    lastRotatedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true, collection: 'credentials' },
);

/** Drives the "expiring soon" dashboard panel. */
credentialSchema.index({ expiresAt: 1 });
credentialSchema.index({ projectId: 1 });

export type Credential = InferSchemaType<typeof credentialSchema>;
export type CredentialDocument = HydratedDocument<Credential>;

export const CredentialModel = model('Credential', credentialSchema);

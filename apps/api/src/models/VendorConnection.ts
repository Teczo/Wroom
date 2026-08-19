import { SYNC_STATUSES, VENDORS, VENDOR_AUTH_TYPES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * A connection to a vendor's API for cost or revenue sync.
 *
 * `secretRef` is a pointer and only a pointer — `kv://teczo/stripe` names where
 * the key lives, the way `credentials.storedIn` does. The key itself is read
 * from the environment at the moment a sync runs and is never written here,
 * returned in a response, or logged. There is deliberately no field on this
 * schema that could hold one.
 */
const scopeSchema = new Schema(
  {
    subscriptionId: { type: String, default: '' },
    orgId: { type: String, default: '' },
    teamId: { type: String, default: '' },
  },
  { _id: false },
);

const vendorConnectionSchema = new Schema(
  {
    vendor: { type: String, enum: VENDORS as unknown as string[], required: true },
    /** The vendor's own account identifier, e.g. `acct_1P...`. Not a credential. */
    accountId: { type: String, default: '' },
    authType: {
      type: String,
      enum: VENDOR_AUTH_TYPES as unknown as string[],
      default: 'api-key',
    },
    secretRef: { type: String, required: true },
    scope: { type: scopeSchema, default: () => ({}) },

    /** Off until someone turns it on. A connection that exists does not sync by itself. */
    syncEnabled: { type: Boolean, default: false },

    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, enum: [...SYNC_STATUSES, null], default: null },
    /** The vendor's own message, kept so a failure is readable without the logs. */
    lastSyncError: { type: String, default: '' },
  },
  { timestamps: true, collection: 'vendorConnections' },
);

/** One connection per vendor. A second Stripe connection would sync twice. */
vendorConnectionSchema.index({ vendor: 1 }, { unique: true });

export type VendorConnection = InferSchemaType<typeof vendorConnectionSchema>;
export type VendorConnectionDocument = HydratedDocument<VendorConnection>;

export const VendorConnectionModel = model('VendorConnection', vendorConnectionSchema);

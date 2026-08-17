import { VENDORS } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** Vendor accounts you own, including the secondary test accounts. */
const accountSchema = new Schema(
  {
    vendor: { type: String, enum: VENDORS as unknown as string[], required: true },
    label: { type: String, required: true, trim: true },
    loginEmail: { type: String, required: true, trim: true, lowercase: true },
    /** Subscription id / org id / team slug — whatever the vendor calls it. */
    accountRef: { type: String, default: '' },
    /** Flags the secondary test accounts. */
    isPrimary: { type: Boolean, default: false },
    billingOwner: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true, collection: 'accounts' },
);

accountSchema.index({ vendor: 1 });

export type Account = InferSchemaType<typeof accountSchema>;
export type AccountDocument = HydratedDocument<Account>;

export const AccountModel = model('Account', accountSchema);

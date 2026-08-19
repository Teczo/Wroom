import { REVENUE_SOURCES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Money in. Manual entry now; Stripe sync writes the same shape later, which is
 * why `externalId` and its index exist before anything populates them.
 *
 * There is no `fxRate` here — `docs/DATA_MODEL.md` does not define one on
 * `revenue`, so entries are AUD only and a non-AUD invoice is a schema decision
 * rather than something to quietly round.
 */
const revenueSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    source: { type: String, enum: REVENUE_SOURCES as unknown as string[], default: 'manual' },
    /** Stripe's invoice or charge id. Null for anything entered by hand. */
    externalId: { type: String, default: null },
    /** Free text — there is no customers collection, deliberately. */
    customerRef: { type: String, default: '' },
    description: { type: String, required: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'AUD', uppercase: true },
    amountAud: { type: Number, required: true, min: 0 },

    /** Only paid revenue reaches the rollup; outstanding is reported separately. */
    paid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },

    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true }, collection: 'revenue' },
);

revenueSchema.index({ projectId: 1 });

/**
 * Idempotency for WRM-050's sync. Partial rather than sparse, for the reason
 * `docs/DATA_MODEL.md` now records: on a compound index `sparse` only skips a
 * document when every field is missing, and `source` is always present — so a
 * sparse index would treat `externalId: null` as a value and permit exactly one
 * manual entry per source.
 */
revenueSchema.index(
  { source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } },
);

export type Revenue = InferSchemaType<typeof revenueSchema>;
export type RevenueDocument = HydratedDocument<Revenue>;

export const RevenueModel = model('Revenue', revenueSchema);

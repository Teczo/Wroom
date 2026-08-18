import { BILLING_CYCLES, COST_SOURCES, VENDORS } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const costSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    /** Optional — some costs are project-wide rather than tied to one service. */
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    vendor: { type: String, enum: VENDORS as unknown as string[], required: true },
    description: { type: String, required: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'AUD', uppercase: true },
    /** Everything is reported in AUD, converted at entry. */
    amountAud: { type: Number, required: true, min: 0 },
    fxRate: { type: Number, default: null },

    billingCycle: { type: String, enum: BILLING_CYCLES as unknown as string[], required: true },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },

    source: { type: String, enum: COST_SOURCES as unknown as string[], default: 'manual' },
    /** Idempotency key for vendor sync — makes a re-run safe. */
    externalId: { type: String, default: null },
  },
  { timestamps: true, collection: 'costs' },
);

costSchema.index({ projectId: 1, periodStart: -1 });
costSchema.index({ vendor: 1, externalId: 1 }, { unique: true, sparse: true });

export type Cost = InferSchemaType<typeof costSchema>;
export type CostDocument = HydratedDocument<Cost>;

export const CostModel = model('Cost', costSchema);

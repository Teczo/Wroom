import { ENQUIRY_SOURCES, ENQUIRY_STATUSES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Inbound contact from the portfolio — the front of the pipeline, not a
 * clients collection (docs/DATA_MODEL.md, resolved decision 4).
 *
 * `status`, `source`, `ownerUserId`, `convertedToProductId`, `meta` and both
 * timestamps are server-set. Nothing in `packages/shared` will validate one of
 * them out of a request body, so the only writer is the server.
 */
const enquirySchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: null },
    company: { type: String, default: null },

    /** Plain text as submitted. The portal renders it as text, never as HTML. */
    message: { type: String, required: true },

    source: {
      type: String,
      enum: ENQUIRY_SOURCES as unknown as string[],
      default: 'portfolio-form',
    },
    relatedProjectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },

    requirement: {
      budgetRange: { type: String, default: null },
      timeline: { type: String, default: null },
      interest: { type: String, default: null },
    },

    status: {
      type: String,
      enum: ENQUIRY_STATUSES as unknown as string[],
      default: 'new',
    },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    convertedToProductId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },

    meta: {
      ip: { type: String, default: '' },
      userAgent: { type: String, default: '' },
      submittedInMs: { type: Number, default: null },
    },
  },
  { timestamps: true, collection: 'enquiries' },
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });

export type Enquiry = InferSchemaType<typeof enquirySchema>;
export type EnquiryDocument = HydratedDocument<Enquiry>;

export const EnquiryModel = model('Enquiry', enquirySchema);

import { DECISION_STATUSES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** ADR-lite: what was decided, why, and what was turned down. */
const decisionSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    context: { type: String, default: '' },
    decision: { type: String, default: '' },
    alternativesRejected: { type: String, default: '' },
    status: { type: String, enum: DECISION_STATUSES as unknown as string[], default: 'proposed' },
    supersededByDecisionId: { type: Schema.Types.ObjectId, ref: 'Decision', default: null },
    decidedAt: { type: Date, default: null },
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'decisions' },
);

decisionSchema.index({ projectId: 1, createdAt: -1 });

export type Decision = InferSchemaType<typeof decisionSchema>;
export type DecisionDocument = HydratedDocument<Decision>;

export const DecisionModel = model('Decision', decisionSchema);

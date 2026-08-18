import { TIME_ACTIVITIES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const timeEntrySchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    featureId: { type: Schema.Types.ObjectId, ref: 'Feature', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Day granularity — no start/stop timer. */
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0 },
    activity: { type: String, enum: TIME_ACTIVITIES as unknown as string[], required: true },
    note: { type: String, default: '' },
    /**
     * Snapshot of the user's rate at entry. Changing your rate later must not
     * silently rewrite history. 0 means uncosted.
     */
    rateAud: { type: Number, default: 0, min: 0 },
    billable: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'timeEntries' },
);

timeEntrySchema.index({ projectId: 1, date: -1 });
timeEntrySchema.index({ userId: 1, date: -1 });

export type TimeEntry = InferSchemaType<typeof timeEntrySchema>;
export type TimeEntryDocument = HydratedDocument<TimeEntry>;

export const TimeEntryModel = model('TimeEntry', timeEntrySchema);

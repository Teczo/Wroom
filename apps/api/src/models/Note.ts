import { NOTE_KINDS, VISIBILITIES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const noteSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    featureId: { type: Schema.Types.ObjectId, ref: 'Feature', default: null },
    /** Markdown. */
    body: { type: String, required: true },
    kind: { type: String, enum: NOTE_KINDS as unknown as string[], default: 'note' },
    visibility: { type: String, enum: VISIBILITIES as unknown as string[], default: 'private' },
    pinned: { type: Boolean, default: false },
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'notes' },
);

noteSchema.index({ projectId: 1, pinned: -1, createdAt: -1 });

export type Note = InferSchemaType<typeof noteSchema>;
export type NoteDocument = HydratedDocument<Note>;

export const NoteModel = model('Note', noteSchema);

import { NOTE_KINDS, VISIBILITIES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Notes hang off either a project or an enquiry, never both and never neither.
 *
 * Enquiry follow-ups reuse this collection rather than getting one of their own
 * (docs/DATA_MODEL.md): pinning, kinds and the markdown body already work here,
 * and a second nearly-identical collection would have to reimplement all three.
 */
const noteSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry', default: null },

    /** Only ever set on a project note — an enquiry has no features. */
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

/**
 * Exactly one owner. Enforced at the schema level rather than in the service so
 * an orphan note cannot be created by any path, including a future one.
 */
noteSchema.pre('validate', function enforceSingleOwner(next) {
  const owners = [this.projectId, this.enquiryId].filter(Boolean).length;

  if (owners !== 1) {
    next(
      new Error(
        'A note belongs to exactly one of a project or an enquiry, never both and never neither.',
      ),
    );
    return;
  }

  next();
});

/** Serves the project notes list, which sorts pinned first then newest. */
noteSchema.index({ projectId: 1, pinned: -1, createdAt: -1 });

/**
 * Sparse, so the half of the collection that belongs to the other kind of owner
 * is not indexed. Safe as single-field indexes — the compound-sparse trap
 * described in docs/DATA_MODEL.md does not apply here.
 */
noteSchema.index({ projectId: 1 }, { sparse: true });
noteSchema.index({ enquiryId: 1 }, { sparse: true });

export type Note = InferSchemaType<typeof noteSchema>;
export type NoteDocument = HydratedDocument<Note>;

export const NoteModel = model('Note', noteSchema);

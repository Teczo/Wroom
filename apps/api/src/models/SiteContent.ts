import { SITE_CONTENT_KEYS } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * The words on a portfolio page, keyed so a new page is a new record rather
 * than a schema change.
 *
 * `draft` and `published` are deliberately the same shape: publishing copies
 * one into the other, so there is no transformation step that could go wrong
 * between what was reviewed in the editor and what the public site serves.
 * `published: null` means never published, and the public route 404s.
 */
const metaSchema = new Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false },
);

function contentBody() {
  return new Schema(
    {
      title: { type: String, default: '' },
      /** Markdown, rendered with react-markdown + rehype-sanitize. */
      body: { type: String, default: '' },
      meta: { type: metaSchema, required: true, default: () => ({}) },
      /**
       * Structured content, whose shape depends on `key`. Mixed here because
       * one Mongoose schema cannot be four; the shape is enforced on write by
       * the per-key schema in `packages/shared/src/schemas/siteContent/`, which
       * is the gate that matters — nothing else validates it.
       */
      data: { type: Schema.Types.Mixed, default: () => ({}) },
    },
    { _id: false },
  );
}

const siteContentSchema = new Schema(
  {
    key: {
      type: String,
      enum: SITE_CONTENT_KEYS as unknown as string[],
      required: true,
      unique: true,
    },

    draft: { type: contentBody(), required: true, default: () => ({}) },

    /** Written by the publish action alone — never by a save. */
    published: { type: contentBody(), default: null },
    publishedAt: { type: Date, default: null },
    publishedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  // The data model gives this collection an `updatedAt` and no `createdAt`:
  // the two records are seeded, so when they came into being says nothing.
  { timestamps: { createdAt: false, updatedAt: true }, collection: 'siteContent' },
);

export type SiteContent = InferSchemaType<typeof siteContentSchema>;
export type SiteContentDocument = HydratedDocument<SiteContent>;

export const SiteContentModel = model('SiteContent', siteContentSchema);

import { MEDIA_KINDS } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Reusable marks — tech logos, platform icons, client and social marks —
 * managed once here instead of re-uploaded per project. Projects reference them
 * by `key`, so the label and the artwork can change in one place.
 */
const mediaLibrarySchema = new Schema(
  {
    kind: { type: String, enum: MEDIA_KINDS as unknown as string[], required: true },
    /** Stable and lowercase. What `projects` and `siteContent` point at. */
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    /**
     * Inline markup. Sanitised in the service layer on every write — the render
     * path uses `dangerouslySetInnerHTML` and has no defence of its own, so this
     * field is only ever as safe as what was allowed through on the way in.
     */
    svg: { type: String, default: '' },
    /** The alternative to `svg`, for marks only available as raster. */
    blobUrl: { type: String, default: null },
    /**
     * The trademark gate. A mark used for "built with" attribution is fine; a
     * client's mark is not, without permission. `false` means the publish action
     * skips it rather than failing.
     */
    usageApproved: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'mediaLibrary' },
);

/** The portal lists a kind at a time, in the order someone arranged them. */
mediaLibrarySchema.index({ kind: 1, sortOrder: 1 });

export type MediaLibraryItem = InferSchemaType<typeof mediaLibrarySchema>;
export type MediaLibraryDocument = HydratedDocument<MediaLibraryItem>;

export const MediaLibraryModel = model('MediaLibrary', mediaLibrarySchema);

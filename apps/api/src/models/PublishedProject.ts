import { ASSET_KINDS, PROJECT_STATUSES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * The portfolio snapshot — the only collection `/public/*` may read.
 *
 * It is flattened on purpose: no account ids, no internal URLs, no costs. A bug
 * in the public API therefore cannot leak a client project or a cost figure,
 * because the data simply is not in this document.
 */
const publishedProjectSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },

    name: { type: String, required: true },
    shortDescription: { type: String, default: '' },
    productName: { type: String, default: '' },

    caseStudy: {
      problem: { type: String, default: '' },
      role: { type: String, default: '' },
      approach: { type: String, default: '' },
      outcome: { type: String, default: '' },
      metrics: {
        type: [
          new Schema(
            { label: { type: String, required: true }, value: { type: String, required: true } },
            { _id: false },
          ),
        ],
        default: [],
      },
      testimonial: {
        type: new Schema(
          {
            quote: { type: String, required: true },
            attribution: { type: String, required: true },
          },
          { _id: false },
        ),
        default: null,
      },
    },

    /** Flattened labels only — never accounts or internal URLs. */
    techStack: { type: [String], default: [] },
    liveUrl: { type: String, default: null },
    platforms: { type: [String], default: [] },

    heroImage: {
      type: new Schema(
        { url: { type: String, required: true }, alt: { type: String, default: '' } },
        { _id: false },
      ),
      default: null,
    },
    gallery: {
      type: [
        new Schema(
          {
            url: { type: String, required: true },
            thumbnailUrl: { type: String, default: null },
            caption: { type: String, default: '' },
            kind: { type: String, enum: ASSET_KINDS as unknown as string[], required: true },
            device: { type: String, default: '' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    status: { type: String, enum: PROJECT_STATUSES as unknown as string[], required: true },
    startedAt: { type: Date, default: null },
    launchedAt: { type: Date, default: null },

    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },

    publishedAt: { type: Date, required: true },
    publishedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: false, collection: 'publishedProjects' },
);

publishedProjectSchema.index({ featured: -1, sortOrder: 1 });

export type PublishedProject = InferSchemaType<typeof publishedProjectSchema>;
export type PublishedProjectDocument = HydratedDocument<PublishedProject>;

export const PublishedProjectModel = model('PublishedProject', publishedProjectSchema);

import { ASSET_KINDS, DEMO_VIDEO_PROVIDERS, PROJECT_STATUSES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * The portfolio snapshot — the only project data `/public/*` may read.
 *
 * Flattened on purpose. There are no account ids, no environment URLs, no costs
 * and no operational references in this shape, so a bug in the public API cannot
 * leak one: the data simply is not in the document.
 *
 * **Every `url` here is a public-container URL with no SAS token.** The three
 * gates ran once, at publish, and the bytes were copied into the public
 * container then. Nothing on the read path signs anything (docs/DATA_MODEL.md,
 * "Publishing").
 */

/** The three resized copies, as public URLs. */
const variantSetSchema = new Schema(
  {
    thumb: { type: String, default: null },
    card: { type: String, default: null },
    hero: { type: String, default: null },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    variants: { type: variantSetSchema, default: null },
  },
  { _id: false },
);

/** Resolved from `mediaLibrary` at publish, so the public site looks nothing up. */
const markSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: '' },
    svg: { type: String, default: '' },
  },
  { _id: false },
);

const metricSchema = new Schema(
  { label: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false },
);

const testimonialSchema = new Schema(
  { quote: { type: String, required: true }, attribution: { type: String, default: '' } },
  { _id: false },
);

const featureCardSchema = new Schema(
  {
    /** Already resolved to markup — the public site makes no library lookup. */
    icon: {
      type: new Schema(
        { svg: { type: String, default: '' }, label: { type: String, default: '' } },
        { _id: false },
      ),
      default: null,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
  },
  { _id: false },
);

const keyModuleSchema = new Schema(
  { title: { type: String, required: true }, body: { type: String, default: '' } },
  { _id: false },
);

const publishedCaseStudySchema = new Schema(
  {
    slug: { type: String, required: true },
    sector: { type: String, default: '' },
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    hero: { type: imageSchema, default: null },
    problem: { type: String, default: '' },
    role: { type: String, default: '' },
    approach: { type: String, default: '' },
    outcome: { type: String, default: '' },
    metrics: { type: [metricSchema], default: [] },
    testimonial: { type: testimonialSchema, default: null },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const demoVideoSchema = new Schema(
  {
    provider: { type: String, enum: DEMO_VIDEO_PROVIDERS as unknown as string[], required: true },
    /** The public blob URL for a `blob` video; null for an embed. */
    url: { type: String, default: null },
    externalId: { type: String, default: null },
    poster: { type: imageSchema, default: null },
  },
  { _id: false },
);

const publishedProjectSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },

    name: { type: String, required: true },
    productName: { type: String, default: '' },

    category: { type: String, default: '' },
    tagline: { type: String, default: '' },
    overview: { type: String, default: '' },
    shortDescription: { type: String, default: '' },

    /** Authored on the project. Never an environment's `publicUrl`. */
    liveUrl: { type: String, default: null },

    featureCards: { type: [featureCardSchema], default: [] },
    keyModules: { type: [keyModuleSchema], default: [] },
    headlineMetric: {
      type: new Schema(
        { value: { type: String, required: true }, label: { type: String, default: '' } },
        { _id: false },
      ),
      default: null,
    },
    testimonial: { type: testimonialSchema, default: null },
    demoVideo: { type: demoVideoSchema, default: null },
    caseStudies: { type: [publishedCaseStudySchema], default: [] },

    techStack: { type: [markSchema], default: [] },
    platforms: { type: [markSchema], default: [] },
    /** Only ever set when the mark was `usageApproved`. */
    clientLogo: {
      type: new Schema(
        { label: { type: String, default: '' }, svg: { type: String, default: '' } },
        { _id: false },
      ),
      default: null,
    },

    heroImage: { type: imageSchema, default: null },
    ogImage: {
      type: new Schema(
        {
          url: { type: String, required: true },
          width: { type: Number, default: 1200 },
          height: { type: Number, default: 630 },
        },
        { _id: false },
      ),
      default: null,
    },
    gallery: {
      type: [
        new Schema(
          {
            url: { type: String, required: true },
            variants: { type: variantSetSchema, default: null },
            caption: { type: String, default: '' },
            kind: { type: String, enum: ASSET_KINDS as unknown as string[], required: true },
            device: { type: String, default: '' },
            alt: { type: String, default: '' },
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

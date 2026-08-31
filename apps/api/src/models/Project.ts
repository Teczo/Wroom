import { DEMO_VIDEO_PROVIDERS, PROJECT_STATUSES, VISIBILITIES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const metricSchema = new Schema(
  { label: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false },
);

const testimonialSchema = new Schema(
  { quote: { type: String, required: true }, attribution: { type: String, required: true } },
  { _id: false },
);

/**
 * One case study on a project. `slug` is unique within the project rather than
 * globally — the eventual route is /work/:projectSlug/case/:caseSlug, so the
 * project slug already disambiguates. Uniqueness is enforced in the shared
 * validation schema, where the whole array is in view.
 */
const caseStudySchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    sector: { type: String, default: '' },
    title: { type: String, default: '' },
    /** The card blurb on the carousel. */
    summary: { type: String, default: '' },
    heroAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
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

/** One card under "Built for Complex Projects". `iconKey` is a mediaLibrary key. */
const featureCardSchema = new Schema(
  {
    iconKey: { type: String, default: '' },
    title: { type: String, required: true },
    body: { type: String, default: '' },
  },
  { _id: false },
);

const keyModuleSchema = new Schema(
  { title: { type: String, required: true }, body: { type: String, default: '' } },
  { _id: false },
);

const headlineMetricSchema = new Schema(
  { value: { type: String, required: true }, label: { type: String, required: true } },
  { _id: false },
);

/**
 * `posterAssetId` is required for every provider, and which of `assetId` and
 * `externalId` is required depends on the provider. Both rules live in the
 * shared validation schema — a Mongoose `required` cannot express "only when",
 * and putting half the rule here would mean two places to keep in step.
 */
const demoVideoSchema = new Schema(
  {
    provider: {
      type: String,
      enum: DEMO_VIDEO_PROVIDERS as unknown as string[],
      default: 'blob',
    },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    externalId: { type: String, default: null },
    posterAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
  },
  { _id: false },
);

const repoSchema = new Schema(
  {
    provider: { type: String, enum: ['github'], default: 'github' },
    fullName: { type: String, default: '' },
    defaultBranch: { type: String, default: 'main' },
    webhookConfigured: { type: Boolean, default: false },
  },
  { _id: false },
);

const techStackSchema = new Schema(
  {
    frontend: { type: [String], default: [] },
    backend: { type: [String], default: [] },
    database: { type: [String], default: [] },
    other: { type: [String], default: [] },
  },
  { _id: false },
);

/** The database is the source of truth; FEATURES.yaml is an export of it. */
const featuresExportSchema = new Schema(
  {
    repoPath: { type: String, default: 'FEATURES.yaml' },
    lastExportedAt: { type: Date, default: null },
    exportVersion: { type: Number, default: 0 },
    offlineEditsDetected: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * Everything the public site renders about a project.
 *
 * Every body section defaults to empty or null, which is what lets the public
 * site drop a section — heading included — rather than render an empty one
 * (CLAUDE.md §7.4).
 */
const portfolioSchema = new Schema(
  {
    /** Private by default. Nothing is ever public by accident. */
    visibility: { type: String, enum: VISIBILITIES as unknown as string[], default: 'private' },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },

    // --- header ---
    /** The chip above the title. */
    category: { type: String, default: '' },
    tagline: { type: String, default: '' },
    overview: { type: String, default: '' },
    /** The "Visit Platform" target — authored, not read from an environment. */
    liveUrl: { type: String, default: null },

    // --- body sections ---
    featureCards: { type: [featureCardSchema], default: [] },
    keyModules: { type: [keyModuleSchema], default: [] },
    headlineMetric: { type: headlineMetricSchema, default: null },
    testimonial: { type: testimonialSchema, default: null },
    demoVideo: { type: demoVideoSchema, default: null },
    caseStudies: { type: [caseStudySchema], default: [] },

    // --- reference data; both are mediaLibrary keys, not labels ---
    techStackKeys: { type: [String], default: [] },
    platformKeys: { type: [String], default: [] },
    /** → mediaLibrary.key, kind "app". The project's own icon. */
    appIconMediaKey: { type: String, default: null },

    // --- media ---
    heroAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    /** 1200x630. Falls back to heroAssetId when null. */
    ogAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    publishedAt: { type: Date, default: null },
  },
  { _id: false },
);

/** Denormalised. Recomputed in the service layer on every write that affects it. */
const rollupSchema = new Schema(
  {
    featureCounts: {
      backlog: { type: Number, default: 0 },
      todo: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
      blocked: { type: Number, default: 0 },
      done: { type: Number, default: 0 },
    },
    percentComplete: { type: Number, default: 0 },
    monthlyCostAud: { type: Number, default: 0 },
    totalSpendAud: { type: Number, default: 0 },
    totalRevenueAud: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    /** hours × rate — kept out of Net unless you opt in. */
    timeCostAud: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: null },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    projectTypeKey: { type: String, required: true },

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    shortDescription: { type: String, default: '' },

    status: { type: String, enum: PROJECT_STATUSES as unknown as string[], default: 'idea' },
    phase: { type: String, default: '' },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    startedAt: { type: Date, default: null },
    launchedAt: { type: Date, default: null },

    repo: { type: repoSchema, required: true, default: () => ({}) },
    techStack: { type: techStackSchema, required: true, default: () => ({}) },

    /** Validated against the project type's fieldDefs before write. */
    details: { type: Schema.Types.Mixed, default: {} },

    tags: { type: [String], default: [] },

    featuresExport: { type: featuresExportSchema, required: true, default: () => ({}) },
    portfolio: { type: portfolioSchema, required: true, default: () => ({}) },
    rollup: { type: rollupSchema, required: true, default: () => ({}) },

    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'projects',
    /**
     * Mongoose minimizes empty objects by default, which drops `details` from
     * both the stored document and `toJSON()` whenever a project has no type
     * fields filled in. The shared `Project` type declares `details` as always
     * present, so the response was lying about its own shape and every reader
     * had to guard. A project created through the bootstrap import leaves
     * `details` empty by design, so that was every one of them.
     */
    minimize: false,
  },
);

projectSchema.index({ productId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ 'portfolio.visibility': 1 });

export type Project = InferSchemaType<typeof projectSchema>;
export type ProjectDocument = HydratedDocument<Project>;

export const ProjectModel = model('Project', projectSchema);

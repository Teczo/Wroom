import { PROJECT_STATUSES, VISIBILITIES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const caseStudySchema = new Schema(
  {
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
        { quote: { type: String, required: true }, attribution: { type: String, required: true } },
        { _id: false },
      ),
      default: null,
    },
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

const portfolioSchema = new Schema(
  {
    /** Private by default. Nothing is ever public by accident. */
    visibility: { type: String, enum: VISIBILITIES as unknown as string[], default: 'private' },
    featured: { type: Boolean, default: false },
    caseStudy: { type: caseStudySchema, default: () => ({}) },
    heroAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
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
  { timestamps: true, collection: 'projects' },
);

projectSchema.index({ productId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ 'portfolio.visibility': 1 });

export type Project = InferSchemaType<typeof projectSchema>;
export type ProjectDocument = HydratedDocument<Project>;

export const ProjectModel = model('Project', projectSchema);

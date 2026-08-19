import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PROJECT_STATUSES,
  VISIBILITIES,
} from '../constants.js';
import {
  arrayOf,
  boolean,
  enumOf,
  isoDate,
  nullable,
  number,
  object,
  objectId,
  partial,
  passthroughRecord,
  repeatable,
  slug,
  string,
  withDefault,
  type Infer,
} from '../validate.js';

const techStackSchema = object({
  frontend: withDefault(arrayOf(string({ min: 1, max: 60 })), []),
  backend: withDefault(arrayOf(string({ min: 1, max: 60 })), []),
  database: withDefault(arrayOf(string({ min: 1, max: 60 })), []),
  other: withDefault(arrayOf(string({ min: 1, max: 60 })), []),
});

const repoSchema = object({
  provider: withDefault(enumOf(['github'] as const), 'github' as const),
  fullName: withDefault(string({ max: 140, allowEmpty: true }), ''),
  defaultBranch: withDefault(string({ max: 140 }), 'main'),
  webhookConfigured: withDefault(boolean(), false),
});

const metricSchema = object({
  label: string({ min: 1, max: 80 }),
  value: string({ min: 1, max: 80 }),
});

const testimonialSchema = object({
  quote: string({ min: 1, max: 1000 }),
  attribution: string({ min: 1, max: 140 }),
});

const caseStudySchema = object({
  problem: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  role: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  approach: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  outcome: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  metrics: withDefault(arrayOf(metricSchema, { max: 12 }), []),
  testimonial: withDefault(nullable(testimonialSchema), null),
});

/**
 * `portfolio.visibility` is accepted here but defaults to private — nothing is
 * ever public by accident, and publishing is a separate explicit action.
 */
const portfolioSchema = object({
  visibility: withDefault(enumOf(VISIBILITIES), 'private' as const),
  featured: withDefault(boolean(), false),
  caseStudy: withDefault(caseStudySchema, {
    problem: '',
    role: '',
    approach: '',
    outcome: '',
    metrics: [],
    testimonial: null,
  }),
  heroAssetId: withDefault(nullable(objectId()), null),
});

export const projectCreateShape = {
  productId: objectId(),
  projectTypeKey: string({ min: 1, max: 40 }),
  name: string({ min: 1, max: 140 }),
  slug: slug(),
  shortDescription: withDefault(string({ max: 400, allowEmpty: true }), ''),
  status: withDefault(enumOf(PROJECT_STATUSES), 'idea' as const),
  phase: withDefault(string({ max: 80, allowEmpty: true }), ''),
  ownerUserId: withDefault(nullable(objectId()), null),
  startedAt: withDefault(nullable(isoDate()), null),
  launchedAt: withDefault(nullable(isoDate()), null),
  repo: withDefault(repoSchema, {
    provider: 'github' as const,
    fullName: '',
    defaultBranch: 'main',
    webhookConfigured: false,
  }),
  techStack: withDefault(techStackSchema, {
    frontend: [],
    backend: [],
    database: [],
    other: [],
  }),
  /** Validated against the project type's fieldDefs in the service layer. */
  details: withDefault(passthroughRecord(), {}),
  tags: withDefault(arrayOf(string({ min: 1, max: 40 }), { max: 30 }), []),
  portfolio: withDefault(portfolioSchema, {
    visibility: 'private' as const,
    featured: false,
    caseStudy: {
      problem: '',
      role: '',
      approach: '',
      outcome: '',
      metrics: [],
      testimonial: null,
    },
    heroAssetId: null,
  }),
};

export const projectCreateSchema = object(projectCreateShape);
export const projectUpdateSchema = partial(projectCreateShape);

/**
 * The case study editor's payload — `projects.portfolio` and nothing else.
 *
 * Setting `visibility: "public"` marks the project *eligible* for the
 * portfolio. It publishes nothing: writing `publishedProjects` stays the
 * explicit action in WRM-044 (CLAUDE.md §8).
 *
 * `publishedAt` is absent on purpose. It records when a publish happened, so
 * only the publish action may write it.
 */
export const projectPortfolioUpdateShape = {
  visibility: enumOf(VISIBILITIES),
  featured: boolean(),
  caseStudy: caseStudySchema,
  heroAssetId: nullable(objectId()),
};

export const projectPortfolioUpdateSchema = partial(projectPortfolioUpdateShape);

/**
 * Query parameters for `GET /api/projects`.
 *
 * `status`, `productId`, `projectTypeKey` and `tag` may each be repeated: values
 * within one parameter are an OR, and the parameters AND together. A value that
 * is not a known status or a well-formed id fails here with the parameter named,
 * so a typo comes back as a 400 rather than a silently empty list.
 */
export const projectListQueryShape = {
  status: repeatable(enumOf(PROJECT_STATUSES)),
  productId: repeatable(objectId()),
  projectTypeKey: repeatable(string({ min: 1, max: 40 })),
  tag: repeatable(string({ min: 1, max: 40 })),
  q: withDefault(string({ max: 140, allowEmpty: true }), ''),
  includeArchived: withDefault(boolean(), false),
  page: withDefault(number({ min: 1, integer: true }), 1),
  limit: withDefault(number({ min: 1, max: MAX_PAGE_SIZE, integer: true }), DEFAULT_PAGE_SIZE),
};

export const projectListQuerySchema = object(projectListQueryShape);
export type ProjectListQuery = Infer<typeof projectListQueryShape>;

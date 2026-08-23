import {
  DEFAULT_PAGE_SIZE,
  DEMO_VIDEO_PROVIDERS,
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
  url,
  withDefault,
  withRules,
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

const featureCardSchema = object({
  /** A `mediaLibrary.key`, not a component name — icons are data (CLAUDE.md §7.3). */
  iconKey: withDefault(string({ max: 80, allowEmpty: true }), ''),
  title: string({ min: 1, max: 140 }),
  body: withDefault(string({ max: 1000, allowEmpty: true }), ''),
});

const keyModuleSchema = object({
  title: string({ min: 1, max: 140 }),
  body: withDefault(string({ max: 1000, allowEmpty: true }), ''),
});

const headlineMetricSchema = object({
  value: string({ min: 1, max: 40 }),
  label: string({ min: 1, max: 140 }),
});

/**
 * A demo video, and the rules about which half of it has to be filled in.
 *
 * `posterAssetId` is required whatever the provider: a video with no poster is
 * a black rectangle until it buffers, and on the hero of a project page that is
 * the first thing a visitor sees. Beyond that, one of our own uploads needs an
 * `assetId` and an embed needs an `externalId` — the two are never both right.
 */
const demoVideoSchema = withRules(
  object({
    provider: withDefault(enumOf(DEMO_VIDEO_PROVIDERS), 'blob' as const),
    assetId: withDefault(nullable(objectId()), null),
    externalId: withDefault(nullable(string({ min: 1, max: 200 })), null),
    posterAssetId: withDefault(nullable(objectId()), null),
  }),
  (video, path, fail) => {
    const at = (field: string) => (path === '' ? field : `${path}.${field}`);

    if (!video.posterAssetId) {
      fail(at('posterAssetId'), 'a poster image is required for every demo video');
    }

    if (video.provider === 'blob' && !video.assetId) {
      fail(at('assetId'), 'is required when the video is one of your own uploads');
    }

    if (video.provider !== 'blob' && !video.externalId) {
      fail(at('externalId'), `is required when the video is hosted on ${video.provider}`);
    }
  },
);

const caseStudySchema = object({
  /** Unique within the project — see the rule on `caseStudies` below. */
  slug: slug(),
  sector: withDefault(string({ max: 80, allowEmpty: true }), ''),
  title: withDefault(string({ max: 200, allowEmpty: true }), ''),
  summary: withDefault(string({ max: 1000, allowEmpty: true }), ''),
  heroAssetId: withDefault(nullable(objectId()), null),
  problem: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  role: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  approach: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  outcome: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  metrics: withDefault(arrayOf(metricSchema, { max: 12 }), []),
  testimonial: withDefault(nullable(testimonialSchema), null),
  sortOrder: withDefault(number({ integer: true }), 0),
});

/**
 * Case study slugs have to be unique within the project.
 *
 * Not globally: two projects may each have an "offshore-platform" case study,
 * and the route that will eventually read this is
 * /work/:projectSlug/case/:caseSlug, so the project slug already disambiguates.
 * Within one project a repeat would make one of the two unreachable.
 */
const caseStudiesSchema = withRules(
  arrayOf(caseStudySchema, { max: 24 }),
  (studies, path, fail) => {
    const seen = new Map<string, number>();

    studies.forEach((study, index) => {
      const first = seen.get(study.slug);

      if (first !== undefined) {
        fail(
          `${path}[${index}].slug`,
          `'${study.slug}' is already used by case study ${first + 1} on this project. Slugs have to be unique within a project.`,
        );
        return;
      }

      seen.set(study.slug, index);
    });
  },
);

/**
 * `portfolio.visibility` is accepted here but defaults to private — nothing is
 * ever public by accident, and publishing is a separate explicit action.
 *
 * Every body section defaults to empty or null. That is what lets the public
 * site drop a whole section, heading included, rather than render an empty one
 * (CLAUDE.md §7.4).
 */
const portfolioSchema = object({
  visibility: withDefault(enumOf(VISIBILITIES), 'private' as const),
  featured: withDefault(boolean(), false),
  sortOrder: withDefault(number({ integer: true }), 0),

  category: withDefault(string({ max: 80, allowEmpty: true }), ''),
  tagline: withDefault(string({ max: 200, allowEmpty: true }), ''),
  overview: withDefault(string({ max: 4000, allowEmpty: true }), ''),
  /** Authored, not derived from the primary environment's publicUrl. */
  liveUrl: withDefault(nullable(url()), null),

  featureCards: withDefault(arrayOf(featureCardSchema, { max: 24 }), []),
  keyModules: withDefault(arrayOf(keyModuleSchema, { max: 24 }), []),
  headlineMetric: withDefault(nullable(headlineMetricSchema), null),
  testimonial: withDefault(nullable(testimonialSchema), null),
  demoVideo: withDefault(nullable(demoVideoSchema), null),
  caseStudies: withDefault(caseStudiesSchema, []),

  /** Both reference `mediaLibrary.key`. Keys, not labels. */
  techStackKeys: withDefault(arrayOf(slug(), { max: 40 }), []),
  platformKeys: withDefault(arrayOf(slug(), { max: 40 }), []),

  heroAssetId: withDefault(nullable(objectId()), null),
  ogAssetId: withDefault(nullable(objectId()), null),
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
    sortOrder: 0,
    category: '',
    tagline: '',
    overview: '',
    liveUrl: null,
    featureCards: [],
    keyModules: [],
    headlineMetric: null,
    testimonial: null,
    demoVideo: null,
    caseStudies: [],
    techStackKeys: [],
    platformKeys: [],
    heroAssetId: null,
    ogAssetId: null,
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
  sortOrder: number({ integer: true }),

  category: string({ max: 80, allowEmpty: true }),
  tagline: string({ max: 200, allowEmpty: true }),
  overview: string({ max: 4000, allowEmpty: true }),
  liveUrl: nullable(url()),

  featureCards: arrayOf(featureCardSchema, { max: 24 }),
  keyModules: arrayOf(keyModuleSchema, { max: 24 }),
  headlineMetric: nullable(headlineMetricSchema),
  testimonial: nullable(testimonialSchema),
  demoVideo: nullable(demoVideoSchema),
  caseStudies: caseStudiesSchema,

  techStackKeys: arrayOf(slug(), { max: 40 }),
  platformKeys: arrayOf(slug(), { max: 40 }),

  heroAssetId: nullable(objectId()),
  ogAssetId: nullable(objectId()),
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

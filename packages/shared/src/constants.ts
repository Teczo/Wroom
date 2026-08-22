/**
 * Enumerations from docs/DATA_MODEL.md.
 *
 * These are the single source of truth for both apps and the API. If a value
 * is not in this file it is not in the data model — do not add one without a
 * change to docs/DATA_MODEL.md first.
 */

export const GLOBAL_ROLES = ['owner', 'developer', 'viewer'] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const PROJECT_TYPE_KEYS = [
  'web',
  'mobile-rn',
  'unity',
  'api',
  'xr',
  'internal-tool',
] as const;
export type ProjectTypeKey = (typeof PROJECT_TYPE_KEYS)[number];

export const FIELD_DEF_TYPES = [
  'text',
  'textarea',
  'number',
  'select',
  'multiselect',
  'url',
  'date',
  'boolean',
] as const;
export type FieldDefType = (typeof FIELD_DEF_TYPES)[number];

export const PRODUCT_STATUSES = ['active', 'paused', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PROJECT_STATUSES = [
  'idea',
  'in-development',
  'live',
  'on-hold',
  'archived',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const VISIBILITIES = ['private', 'client-only', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VENDORS = [
  'azure',
  'mongodb-atlas',
  'vercel',
  'render',
  'auth0',
  'stripe',
  'anthropic',
  'openai',
  'apple',
  'google-play',
  'namecheap',
  'other',
] as const;
export type Vendor = (typeof VENDORS)[number];

/** `vendorConnections.authType` (docs/DATA_MODEL.md). */
export const VENDOR_AUTH_TYPES = ['service-principal', 'api-key', 'oauth'] as const;
export type VendorAuthType = (typeof VENDOR_AUTH_TYPES)[number];

/** `vendorConnections.lastSyncStatus`. Null until a sync has actually run. */
export const SYNC_STATUSES = ['ok', 'failed'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

/**
 * Where a Stripe invoice names the Wroom project it belongs to.
 *
 * `docs/DATA_MODEL.md` has no field tying a Stripe customer or subscription to
 * a project, so attribution is by invoice metadata alone. Both spellings are
 * accepted because Stripe metadata is free text and either is a reasonable
 * thing to have typed; an invoice carrying neither is reported, never guessed at.
 */
export const STRIPE_PROJECT_SLUG_KEYS = ['project_slug', 'projectSlug'] as const;

/**
 * Prefixes Stripe uses for keys and secrets. `secretRef` is a pointer, so any
 * value starting with one of these is a credential someone pasted by mistake
 * and is refused before it can be written.
 */
export const STRIPE_KEY_PREFIXES = ['sk_', 'rk_', 'pk_', 'whsec_'] as const;

export const SERVICE_ROLES = [
  'frontend',
  'backend',
  'database',
  'storage',
  'auth',
  'ai',
  'email',
  'payments',
  'domain',
  'other',
] as const;
export type ServiceRole = (typeof SERVICE_ROLES)[number];

export const SERVICE_STATUSES = ['active', 'suspended', 'deleted'] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const ENVIRONMENT_NAMES = ['dev', 'staging', 'production'] as const;
export type EnvironmentName = (typeof ENVIRONMENT_NAMES)[number];

export const PROJECT_LINK_TYPES = [
  'component-of',
  'depends-on',
  'shares-backend',
  'related',
] as const;
export type ProjectLinkType = (typeof PROJECT_LINK_TYPES)[number];

export const FEATURE_STATUSES = [
  'backlog',
  'todo',
  'in-progress',
  'blocked',
  'review',
  'done',
] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

/** Columns rendered on the Kanban board, left to right. */
export const FEATURE_BOARD_COLUMNS = FEATURE_STATUSES;

export const FEATURE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type FeaturePriority = (typeof FEATURE_PRIORITIES)[number];

export const FEATURE_SIZES = ['xs', 's', 'm', 'l', 'xl'] as const;
export type FeatureSize = (typeof FEATURE_SIZES)[number];

export const FEATURE_SOURCES = ['manual', 'csv', 'repo-sync'] as const;
export type FeatureSource = (typeof FEATURE_SOURCES)[number];

/** Manual sort within a Kanban column uses gaps of 1000. */
export const FEATURE_ORDER_GAP = 1000;

export const BILLING_CYCLES = ['monthly', 'annual', 'one-off', 'usage'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const COST_SOURCES = ['manual', 'azure-api', 'atlas-api', 'stripe'] as const;
export type CostSource = (typeof COST_SOURCES)[number];

/** `stripe` is written by WRM-050's sync; a person enters the other two. */
export const REVENUE_SOURCES = ['stripe', 'invoice', 'manual'] as const;
export type RevenueSource = (typeof REVENUE_SOURCES)[number];

/** What a person may enter by hand. Sync owns `stripe`. */
export const MANUAL_REVENUE_SOURCES = ['invoice', 'manual'] as const;

export const ASSET_KINDS = [
  'screenshot',
  'video',
  'logo',
  'diagram',
  'document',
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/**
 * The three image variants, and the only place their widths are written down.
 *
 * A width never comes from a request. The client says nothing about size that
 * the server acts on — `sharp` reads the real dimensions off the validated
 * original, and these are the targets it resizes towards (CLAUDE.md §8).
 *
 * The portfolio picks one per surface: `thumb` for thumbnail strips and tech
 * grids, `card` for carousel and index cards, `hero` for the main image.
 */
export const ASSET_VARIANT_WIDTHS = {
  thumb: 400,
  card: 800,
  hero: 1600,
} as const;

export const ASSET_VARIANT_NAMES = ['thumb', 'card', 'hero'] as const;
export type AssetVariantName = (typeof ASSET_VARIANT_NAMES)[number];

/**
 * Kinds that get variants. Video and document are skipped — there is nothing to
 * resize, and `variants` stays null for them (docs/DATA_MODEL.md).
 *
 * `image/svg+xml` is an allowed upload but is not rasterised either: an SVG is
 * already resolution-independent, and running one through an image pipeline
 * would turn a 2KB vector into three raster copies of it.
 */
export const VARIANT_ASSET_KINDS = ['screenshot', 'logo', 'diagram'] as const;

export const NOTE_KINDS = ['note', 'meeting', 'idea', 'issue'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const CREDENTIAL_KINDS = [
  'api-key',
  'certificate',
  'domain',
  'subscription',
  'signing-key',
] as const;
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export const DECISION_STATUSES = ['proposed', 'accepted', 'superseded'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const ENQUIRY_STATUSES = [
  'new',
  'read',
  'qualified',
  'quoted',
  'won',
  'lost',
  'spam',
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_SOURCES = ['portfolio-form', 'manual', 'referral'] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

/**
 * What a person may type in by hand. `portfolio-form` means it came through
 * the public form, so only the public form may claim it.
 */
export const MANUAL_ENQUIRY_SOURCES = ['manual', 'referral'] as const;

/**
 * Length caps on the one public write. Exported so the form can refuse a value
 * the server would refuse anyway, rather than letting someone type six thousand
 * characters and find out on submit.
 */
export const ENQUIRY_LIMITS = {
  name: 120,
  email: 200,
  phone: 40,
  company: 160,
  message: 5000,
  requirement: 200,
} as const;

/**
 * The bot checks, both halves of which have to agree between the form and the
 * server. The honeypot is a field a person never sees and never fills; the
 * minimum is how long a real person takes to write a message, below which the
 * submission is a script.
 */
export const ENQUIRY_HONEYPOT_FIELD = 'website';
export const ENQUIRY_MIN_SUBMIT_MS = 2500;

/**
 * `siteContent.key`. A page's copy is a record rather than a schema change, so
 * this list is what a page may be keyed by — not what exists. Only `about` and
 * `contact` are seeded, and `key` is not creatable through the API.
 */
export const SITE_CONTENT_KEYS = ['about', 'contact', 'home'] as const;
export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

/** The whole set of records, seeded on a fresh database. */
export const SEEDED_SITE_CONTENT_KEYS: readonly SiteContentKey[] = ['about', 'contact'];

export const TIME_ACTIVITIES = [
  'build',
  'debug',
  'design',
  'meeting',
  'research',
  'admin',
] as const;
export type TimeActivity = (typeof TIME_ACTIVITIES)[number];

/** All money is stored in AUD, converted at entry (DATA_MODEL.md, resolved decision 2). */
export const BASE_CURRENCY = 'AUD';

/** Run-rate rule: monthly + annual/12. One-off and usage are excluded. */
export const RUN_RATE_BILLING_CYCLES: readonly BillingCycle[] = ['monthly', 'annual'];

/** Error codes returned in `{ error: { code } }`. */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Upload limits enforced server-side before a SAS URL is issued. */
export const UPLOAD_LIMITS = {
  maxSizeBytes: 50 * 1024 * 1024,
  allowedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'application/pdf',
  ],
} as const;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

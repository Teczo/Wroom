/**
 * API response shapes, shared by both frontends.
 *
 * These mirror docs/DATA_MODEL.md with two transport adjustments: `_id` and any
 * reference is a string, and every date is an ISO-8601 string.
 */

import type {
  AssetKind,
  BillingCycle,
  CostSource,
  CredentialKind,
  DecisionStatus,
  EnvironmentName,
  EnquirySource,
  EnquiryStatus,
  FeaturePriority,
  FeatureSize,
  FeatureSource,
  FeatureStatus,
  FieldDefType,
  GlobalRole,
  MediaKind,
  NoteKind,
  ProductStatus,
  ProjectLinkType,
  ProjectStatus,
  ServiceRole,
  ServiceStatus,
  SiteContentKey,
  SyncStatus,
  TimeActivity,
  Vendor,
  VendorAuthType,
  Visibility,
} from './constants.js';

export type Id = string;
export type IsoDate = string;

export type Timestamps = {
  createdAt: IsoDate;
  updatedAt: IsoDate;
};

// --- envelope ---------------------------------------------------------------

export type ListMeta = {
  total: number;
  page: number;
  limit: number;
};

export type ApiSuccess<T> = { data: T };
export type ApiList<T> = { data: T[]; meta: ListMeta };
export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

// --- collections ------------------------------------------------------------

export type User = Timestamps & {
  _id: Id;
  authProviderId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  globalRole: GlobalRole;
  defaultHourlyRateAud: number;
  active: boolean;
};

export type FieldDef = {
  key: string;
  label: string;
  type: FieldDefType;
  options: string[];
  required: boolean;
  group: string;
  helpText: string;
  showIf: { field: string; equals: unknown } | null;
};

export type ProjectType = Timestamps & {
  _id: Id;
  key: string;
  label: string;
  icon: string;
  sortOrder: number;
  active: boolean;
  fieldDefs: FieldDef[];
  expectedServiceRoles: ServiceRole[];
  defaultTechStack: { frontend: string[]; backend: string[] };
};

export type Product = Timestamps & {
  _id: Id;
  name: string;
  slug: string;
  description: string;
  isClientWork: boolean;
  clientName: string | null;
  ndaRestricted: boolean;
  status: ProductStatus;
};

export type CaseStudyMetric = { label: string; value: string };

export type CaseStudy = {
  problem: string;
  role: string;
  approach: string;
  outcome: string;
  metrics: CaseStudyMetric[];
  testimonial: { quote: string; attribution: string } | null;
};

/**
 * A reusable mark — a tech logo, platform icon, client or social mark. Icons
 * are data, so this is a record you edit rather than a file in a components
 * folder (CLAUDE.md §7.3).
 */
export type MediaLibraryItem = Timestamps & {
  _id: Id;
  kind: MediaKind;
  /** Stable and lowercase. What projects and siteContent point at. */
  key: string;
  label: string;
  /** Inline markup, already sanitised server-side on write. */
  svg: string;
  /** The alternative to `svg`, for marks only available as raster. */
  blobUrl: string | null;
  /** The trademark gate. `false` drops it from every published surface. */
  usageApproved: boolean;
  sortOrder: number;
};

export type ProjectRollup = {
  featureCounts: {
    backlog: number;
    todo: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
  percentComplete: number;
  monthlyCostAud: number;
  totalSpendAud: number;
  totalRevenueAud: number;
  totalHours: number;
  timeCostAud: number;
  lastActivityAt: IsoDate | null;
};

export type Project = Timestamps & {
  _id: Id;
  productId: Id;
  projectTypeKey: string;
  name: string;
  slug: string;
  shortDescription: string;
  status: ProjectStatus;
  phase: string;
  ownerUserId: Id | null;
  startedAt: IsoDate | null;
  launchedAt: IsoDate | null;
  repo: {
    provider: 'github';
    fullName: string;
    defaultBranch: string;
    webhookConfigured: boolean;
  };
  techStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    other: string[];
  };
  details: Record<string, unknown>;
  tags: string[];
  featuresExport: {
    repoPath: string;
    lastExportedAt: IsoDate | null;
    exportVersion: number;
    offlineEditsDetected: boolean;
  };
  portfolio: {
    visibility: Visibility;
    featured: boolean;
    caseStudy: CaseStudy;
    heroAssetId: Id | null;
    publishedAt: IsoDate | null;
  };
  rollup: ProjectRollup;
  archivedAt: IsoDate | null;
  /**
   * The project's primary environment, attached on reads so a list can show
   * where something is running without a request per project. Absent on the
   * responses to a create or an update.
   */
  primaryEnvironment?: { name: EnvironmentName; publicUrl: string | null } | null;
};

/** Statuses the dashboard reports on. Archived projects are retired, not tracked. */
export type TrackedProjectStatus = Exclude<ProjectStatus, 'archived'>;

/** One row of the dashboard's least-recently-active list. */
export type DashboardProjectRow = {
  _id: Id;
  name: string;
  slug: string;
  status: ProjectStatus;
  percentComplete: number;
  monthlyCostAud: number;
  totalSpendAud: number;
  lastActivityAt: IsoDate | null;
};

/**
 * The dashboard's whole payload, read in one aggregate query. Everything here
 * comes from the denormalised `projects.rollup` — the dashboard never reads
 * costs, time entries or features itself.
 */
export type DashboardSummary = {
  /** Every tracked status is present, zero-filled. Archived is excluded. */
  statusCounts: Record<TrackedProjectStatus, number>;
  totals: {
    projects: number;
    monthlyCostAud: number;
    totalSpendAud: number;
  };
  leastRecentlyActive: DashboardProjectRow[];
};

export type Account = Timestamps & {
  _id: Id;
  vendor: Vendor;
  label: string;
  loginEmail: string;
  accountRef: string;
  isPrimary: boolean;
  billingOwner: string;
  notes: string;
};

export type Environment = Timestamps & {
  _id: Id;
  projectId: Id;
  name: EnvironmentName;
  branch: string;
  publicUrl: string | null;
  isPrimary: boolean;
  healthCheckUrl: string | null;
};

export type Service = Timestamps & {
  _id: Id;
  projectId: Id;
  environmentId: Id;
  role: ServiceRole;
  vendor: Vendor;
  accountId: Id | null;
  resourceName: string;
  region: string;
  url: string | null;
  plan: string;
  status: ServiceStatus;
  externalRef: string | null;
};

export type ProjectLink = {
  _id: Id;
  fromProjectId: Id;
  toProjectId: Id;
  type: ProjectLinkType;
  note: string;
  createdAt: IsoDate;
};

/** Just enough of the project at the other end of a link to render a row. */
export type LinkedProject = {
  _id: Id;
  name: string;
  slug: string;
  status: ProjectStatus;
};

export type ProjectLinkWithProject = ProjectLink & { project: LinkedProject };

/**
 * Links read from one project's point of view: what it points at, what points
 * back, and the answer to "what breaks if I kill this".
 */
export type ProjectLinks = {
  outgoing: ProjectLinkWithProject[];
  incoming: ProjectLinkWithProject[];
  /** Incoming `depends-on` links — the count that matters before deleting. */
  dependedOnByCount: number;
};

/** Enough of a feature to render it as a dependency chip. */
export type FeatureSummary = {
  _id: Id;
  ref: string;
  title: string;
  status: FeatureStatus;
};

export type Feature = Timestamps & {
  _id: Id;
  projectId: Id;
  ref: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  size: FeatureSize;
  order: number;
  assigneeUserId: Id | null;
  labels: string[];
  dependsOnFeatureIds: Id[];
  branch: string | null;
  prUrl: string | null;
  completedAt: IsoDate | null;
  blockedReason: string | null;
  source: FeatureSource;
  externalKey: string | null;
  /** What this feature waits on. Attached on reads, never written directly. */
  dependencies?: FeatureSummary[];
  /** What waits on this feature. */
  dependents?: FeatureSummary[];
};

/** The nine documented CSV columns. Anything else is reported and ignored. */
export const FEATURE_CSV_COLUMNS = [
  'ref',
  'title',
  'description',
  'acceptanceCriteria',
  'status',
  'priority',
  'size',
  'labels',
  'dependsOn',
] as const;

export type FeatureCsvColumn = (typeof FEATURE_CSV_COLUMNS)[number];

/** One field an update would change, as the preview shows it. */
export type ImportFieldChange = {
  field: string;
  from: string;
  to: string;
};

export type ImportInsertRow = {
  row: number;
  ref: string;
  title: string;
  status: FeatureStatus;
};

export type ImportUpdateRow = {
  row: number;
  ref: string;
  featureId: Id;
  title: string;
  changes: ImportFieldChange[];
};

export type ImportInvalidRow = {
  row: number;
  ref: string;
  /** The column at fault, when one column is to blame. */
  column: string | null;
  reason: string;
};

/** A feature already on the project that the file says nothing about. */
export type ImportUnaffectedRow = {
  ref: string;
  title: string;
};

export type FeatureImportDiff = {
  inserts: ImportInsertRow[];
  updates: ImportUpdateRow[];
  invalid: ImportInvalidRow[];
  unaffected: ImportUnaffectedRow[];
  /** Column headers in the file that are not one of the documented nine. */
  unknownColumns: string[];
};

export type FeatureImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

export type Cost = Timestamps & {
  _id: Id;
  projectId: Id;
  serviceId: Id | null;
  accountId: Id | null;
  vendor: Vendor;
  description: string;
  amount: number;
  currency: string;
  amountAud: number;
  fxRate: number | null;
  billingCycle: BillingCycle;
  periodStart: IsoDate | null;
  periodEnd: IsoDate | null;
  source: CostSource;
  externalId: string | null;
};

export type Asset = {
  _id: Id;
  projectId: Id;
  featureId: Id | null;
  kind: AssetKind;
  blobUrl: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  title: string;
  caption: string;
  altText: string;
  device: string;
  visibility: Visibility;
  sortOrder: number;
  capturedAt: IsoDate | null;
  uploadedByUserId: Id | null;
  createdAt: IsoDate;
};

export type Note = Timestamps & {
  _id: Id;
  /** Exactly one of `projectId` and `enquiryId` is set. */
  projectId: Id | null;
  enquiryId: Id | null;
  featureId: Id | null;
  body: string;
  kind: NoteKind;
  visibility: Visibility;
  pinned: boolean;
  authorUserId: Id | null;
};

export type Credential = Timestamps & {
  _id: Id;
  projectId: Id;
  serviceId: Id | null;
  accountId: Id | null;
  label: string;
  kind: CredentialKind;
  /** A location, never a value. */
  storedIn: string;
  expiresAt: IsoDate | null;
  renewalCostAud: number;
  alertDaysBefore: number;
  lastRotatedAt: IsoDate | null;
  notes: string;
};

export type Decision = {
  _id: Id;
  projectId: Id;
  title: string;
  context: string;
  decision: string;
  alternativesRejected: string;
  status: DecisionStatus;
  supersededByDecisionId: Id | null;
  decidedAt: IsoDate | null;
  authorUserId: Id | null;
  createdAt: IsoDate;
};

export type TimeEntry = Timestamps & {
  _id: Id;
  projectId: Id;
  featureId: Id | null;
  userId: Id;
  date: IsoDate;
  hours: number;
  activity: TimeActivity;
  note: string;
  rateAud: number;
  billable: boolean;
};

// --- vendor sync ------------------------------------------------------------

/**
 * A connection to a vendor's API, per `docs/DATA_MODEL.md`.
 *
 * `secretRef` is a pointer such as `kv://teczo/stripe` and nothing else. The
 * key itself lives in the deployment environment and is never written to this
 * collection, returned in a response, or logged.
 */
export type VendorConnection = Timestamps & {
  _id: Id;
  vendor: Vendor;
  accountId: string;
  authType: VendorAuthType;
  secretRef: string;
  scope: { subscriptionId: string; orgId: string; teamId: string };
  syncEnabled: boolean;
  lastSyncAt: IsoDate | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncError: string;
};

/**
 * An invoice the sync could not attribute to a project. Returned in the sync
 * response so the metadata can be corrected at the Stripe end — deliberately
 * not stored, since it describes a problem that will not exist after the fix.
 */
export type StripeUnmatchedInvoice = {
  invoiceId: string;
  customerRef: string;
  /** The slug found in metadata, when there was one that matched no project. */
  slug: string | null;
  reason: 'no-slug' | 'unknown-project';
};

/** What a run of the Stripe sync did. Counts first, then what needs a human. */
export type StripeSyncResult = {
  imported: number;
  updated: number;
  skippedUnmatched: number;
  failed: number;
  /** Draft and void invoices: neither money in nor money owed. */
  skippedNotBillable: number;
  unmatched: StripeUnmatchedInvoice[];
  /** Reasons behind `failed`, safe to display. */
  failures: string[];
  invoicesRead: number;
  projectsAffected: number;
  since: IsoDate | null;
  syncedAt: IsoDate;
};

// --- portfolio snapshot -----------------------------------------------------

export type PublishedGalleryItem = {
  url: string;
  thumbnailUrl: string | null;
  caption: string;
  kind: AssetKind;
  device: string;
};

export type PublishedProject = {
  _id: Id;
  projectId: Id;
  slug: string;
  name: string;
  shortDescription: string;
  productName: string;
  caseStudy: CaseStudy;
  techStack: string[];
  liveUrl: string | null;
  platforms: string[];
  heroImage: { url: string; alt: string } | null;
  gallery: PublishedGalleryItem[];
  status: ProjectStatus;
  startedAt: IsoDate | null;
  launchedAt: IsoDate | null;
  featured: boolean;
  sortOrder: number;
  publishedAt: IsoDate;
  publishedByUserId: Id | null;
};

// --- site content -----------------------------------------------------------

/**
 * The words on one portfolio page. `draft` and `published` are the same shape,
 * which is what makes publishing a copy rather than a transformation.
 */
export type SiteContentBody = {
  title: string;
  body: string;
  meta: { title: string; description: string };
};

export type SiteContent = {
  _id: Id;
  key: SiteContentKey;
  draft: SiteContentBody;
  /** Null means never published — the public route 404s. */
  published: SiteContentBody | null;
  publishedAt: IsoDate | null;
  publishedByUserId: Id | null;
  updatedAt: IsoDate;
  updatedByUserId: Id | null;
};

/** A row of `GET /api/content`: which page, whether it is live, last edited. */
export type SiteContentSummary = {
  _id: Id;
  key: SiteContentKey;
  isPublished: boolean;
  updatedAt: IsoDate;
};

// --- enquiries --------------------------------------------------------------

/**
 * Inbound contact from the portfolio. Everything a caller may set is content;
 * everything else on this record is written by the server.
 */
export type Enquiry = Timestamps & {
  _id: Id;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  /** Plain text as submitted. Never rendered as HTML. */
  message: string;
  source: EnquirySource;
  relatedProjectId: Id | null;
  requirement: {
    budgetRange: string | null;
    timeline: string | null;
    interest: string | null;
  };
  status: EnquiryStatus;
  ownerUserId: Id | null;
  convertedToProductId: Id | null;
  meta: { ip: string; userAgent: string; submittedInMs: number | null };
};

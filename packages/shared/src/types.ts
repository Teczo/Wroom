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
  FeaturePriority,
  FeatureSize,
  FeatureSource,
  FeatureStatus,
  FieldDefType,
  GlobalRole,
  NoteKind,
  ProductStatus,
  ProjectLinkType,
  ProjectStatus,
  ServiceRole,
  ServiceStatus,
  TimeActivity,
  Vendor,
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
  projectId: Id;
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

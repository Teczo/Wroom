import {
  FEATURE_PRIORITIES,
  FEATURE_SIZES,
  FEATURE_STATUSES,
  PRODUCT_STATUSES,
  PROJECT_STATUSES,
} from '../constants.js';
import {
  arrayOf,
  boolean,
  enumOf,
  nullable,
  slug,
  string,
  strictObject,
  withDefault,
  withRules,
} from '../validate.js';

/**
 * The bootstrap payload: one product, one project and its features, in a single
 * body, so a brainstorm becomes a real project without walking the portal's
 * create form three times.
 *
 * Everything here is `strictObject`. A field the importer does not write is an
 * error rather than something quietly dropped — a caller that sends
 * `projects.details` or an environment should be told it went nowhere, not left
 * believing it was saved.
 */

/**
 * A feature ref, accepted in either case and upper-cased by the service — the
 * CSV importer does the same, and the two paths must agree on what `WRM-1` and
 * `wrm-1` mean or they would match different features.
 */
const FEATURE_REF = /^[A-Za-z][A-Za-z0-9]*-\d+$/;

/** Enough features for a brainstorm; far past it means something generated junk. */
export const BOOTSTRAP_MAX_FEATURES = 200;

/**
 * The whole body, measured after parsing.
 *
 * `express.json` is capped at 1mb in `app.ts` and that limit is not this
 * importer's to move, so the schema stops well short of it. Below the parser's
 * limit the rejection is a 400 naming the field, which a caller can act on;
 * above it the parser answers first and the caller learns nothing.
 */
export const BOOTSTRAP_MAX_PAYLOAD_BYTES = 512_000;

/**
 * The product half. Matched on slug: a product with this slug is updated, and
 * one that does not exist is created.
 */
export const bootstrapProductSchema = strictObject({
  name: string({ min: 1, max: 120 }),
  slug: slug(),
  description: withDefault(string({ max: 2000, allowEmpty: true }), ''),
  isClientWork: withDefault(boolean(), false),
  clientName: withDefault(nullable(string({ max: 120 })), null),
  ndaRestricted: withDefault(boolean(), false),
  status: withDefault(enumOf(PRODUCT_STATUSES), 'active' as const),
});

/**
 * The project half. Matched on slug, and its `productId` comes from the product
 * above rather than the body — the two halves of one payload always belong
 * together.
 *
 * Absent on purpose:
 * - `details`, which validates against the project type's `fieldDefs` and
 *   differs per type. Jaya fills it in the portal (ticket decision).
 * - `portfolio`, because publishing is an explicit action and nothing arrives
 *   public by accident (CLAUDE.md §8).
 * - `ownerUserId`, `startedAt` and `launchedAt` — bookkeeping a brainstorm does
 *   not produce, and an owner would need a real user id the caller has no way
 *   to know.
 */
export const bootstrapProjectSchema = strictObject({
  projectTypeKey: string({ min: 1, max: 40 }),
  name: string({ min: 1, max: 140 }),
  slug: slug(),
  shortDescription: withDefault(string({ max: 400, allowEmpty: true }), ''),
  status: withDefault(enumOf(PROJECT_STATUSES), 'idea' as const),
  phase: withDefault(string({ max: 80, allowEmpty: true }), ''),
  tags: withDefault(arrayOf(string({ min: 1, max: 40 }), { max: 30 }), []),
  techStack: withDefault(
    strictObject({
      frontend: withDefault(arrayOf(string({ min: 1, max: 60 }), { max: 40 }), []),
      backend: withDefault(arrayOf(string({ min: 1, max: 60 }), { max: 40 }), []),
      database: withDefault(arrayOf(string({ min: 1, max: 60 }), { max: 40 }), []),
      other: withDefault(arrayOf(string({ min: 1, max: 60 }), { max: 40 }), []),
    }),
    { frontend: [], backend: [], database: [], other: [] },
  ),
  repo: withDefault(
    strictObject({
      provider: withDefault(enumOf(['github'] as const), 'github' as const),
      fullName: withDefault(string({ max: 140, allowEmpty: true }), ''),
      defaultBranch: withDefault(string({ max: 140 }), 'main'),
    }),
    { provider: 'github' as const, fullName: '', defaultBranch: 'main' },
  ),
});

/**
 * One feature. The same fields the CSV importer carries, because both feed the
 * same planner — `dependsOn` names other features by ref, not by id, since a
 * payload describing features that do not exist yet has no ids to give.
 *
 * `status`, `priority` and `size` are enums here rather than free strings: this
 * payload is generated, so a bad value is a caller bug worth a 400 naming
 * `features[3].status`, not a row to skip quietly.
 */
export const bootstrapFeatureSchema = strictObject({
  ref: string({ min: 2, max: 40, pattern: FEATURE_REF }),
  title: string({ min: 1, max: 200 }),
  description: withDefault(string({ max: 8000, allowEmpty: true }), ''),
  acceptanceCriteria: withDefault(string({ max: 2000, allowEmpty: true }), ''),
  status: withDefault(enumOf(FEATURE_STATUSES), 'backlog' as const),
  priority: withDefault(enumOf(FEATURE_PRIORITIES), 'medium' as const),
  size: withDefault(enumOf(FEATURE_SIZES), 'm' as const),
  labels: withDefault(arrayOf(string({ min: 1, max: 40 }), { max: 20 }), []),
  dependsOn: withDefault(
    arrayOf(string({ min: 2, max: 40, pattern: FEATURE_REF }), { max: 50 }),
    [],
  ),
});

export const bootstrapImportShape = {
  product: bootstrapProductSchema,
  project: bootstrapProjectSchema,
  features: withDefault(arrayOf(bootstrapFeatureSchema, { max: BOOTSTRAP_MAX_FEATURES }), []),
};

/**
 * Both routes take the same body. Commit re-validates and re-plans rather than
 * accepting a plan handed back by the client, so what gets written is what the
 * server itself judged — the CSV importer works the same way and for the same
 * reason.
 *
 * Duplicate refs are not checked here. The feature planner already reports them
 * per row, and a second implementation would be a second thing to keep in step.
 */
export const bootstrapImportSchema = withRules(
  strictObject(bootstrapImportShape),
  (payload, path, fail) => {
    const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;

    if (bytes > BOOTSTRAP_MAX_PAYLOAD_BYTES) {
      fail(
        path,
        `This payload is ${Math.ceil(bytes / 1000)}kB. The limit is ${BOOTSTRAP_MAX_PAYLOAD_BYTES / 1000}kB — split it into smaller imports.`,
      );
    }
  },
);

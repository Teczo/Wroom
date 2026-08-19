import { ASSET_KINDS, VISIBILITIES } from '../constants.js';
import {
  arrayOf,
  enumOf,
  isoDate,
  nullable,
  number,
  object,
  objectId,
  string,
  strictPartial,
  withDefault,
} from '../validate.js';

/**
 * Body for POST /api/uploads/sas — asks the API for a short-lived upload URL.
 * Mime type and size are checked server-side before the URL is issued; the
 * storage connection string never reaches the client.
 */
export const uploadRequestSchema = object({
  projectId: objectId(),
  filename: string({ min: 1, max: 260 }),
  mimeType: string({ min: 3, max: 140 }),
  sizeBytes: number({ min: 1, integer: true }),
});

/**
 * The same request under `/api/projects/:id/assets/upload-url`, where the
 * project comes from the route rather than the body.
 */
export const projectUploadRequestSchema = object({
  filename: string({ min: 1, max: 260 }),
  mimeType: string({ min: 3, max: 140 }),
  sizeBytes: number({ min: 1, integer: true }),
});

/**
 * Registers a blob the API itself issued an upload URL for.
 *
 * There is deliberately no `blobUrl` here. The client sends back the
 * `blobName` the server generated, and the server rebuilds the URL from it —
 * so a hand-edited body cannot point a record at somewhere else entirely.
 *
 * `visibility` is absent too: an asset is private on creation, full stop.
 * Changing it is WRM-041's job, not something a create call can slip in.
 */
export const assetCreateShape = {
  featureId: withDefault(nullable(objectId()), null),
  kind: enumOf(ASSET_KINDS),
  /** The path within the container, exactly as `upload-url` returned it. */
  blobName: string({ min: 1, max: 400 }),
  filename: string({ min: 1, max: 260 }),
  mimeType: string({ min: 3, max: 140 }),
  sizeBytes: number({ min: 1, integer: true }),
  width: withDefault(nullable(number({ min: 0, integer: true })), null),
  height: withDefault(nullable(number({ min: 0, integer: true })), null),
  durationSec: withDefault(nullable(number({ min: 0 })), null),
  title: withDefault(string({ max: 200, allowEmpty: true }), ''),
  caption: withDefault(string({ max: 1000, allowEmpty: true }), ''),
  altText: withDefault(string({ max: 500, allowEmpty: true }), ''),
  device: withDefault(string({ max: 80, allowEmpty: true }), ''),
  sortOrder: withDefault(number({ integer: true }), 0),
  capturedAt: withDefault(nullable(isoDate()), null),
};

export const assetCreateSchema = object(assetCreateShape);

/**
 * What an edit may touch — how an asset is described and who may see it.
 *
 * Strict, so `blobUrl`, `filename`, `mimeType`, `sizeBytes` and
 * `uploadedByUserId` come back as a 400 naming the field rather than being
 * quietly dropped. Which file a record points at, and how big it is, are facts
 * about the upload; they are not editable after the fact.
 */
export const assetUpdateSchema = strictPartial({
  featureId: assetCreateShape.featureId,
  kind: assetCreateShape.kind,
  title: assetCreateShape.title,
  caption: assetCreateShape.caption,
  altText: assetCreateShape.altText,
  device: assetCreateShape.device,
  sortOrder: assetCreateShape.sortOrder,
  capturedAt: assetCreateShape.capturedAt,
  /**
   * Making an asset public makes it *eligible* for the portfolio. It does not
   * publish anything — that stays an explicit action (CLAUDE.md §8).
   */
  visibility: withDefault(enumOf(VISIBILITIES), 'private' as const),
});

/** Body for PATCH /api/projects/:id/assets/order — the whole order at once. */
export const assetOrderSchema = object({
  assetIds: arrayOf(objectId(), { max: 500 }),
});

import { ASSET_KINDS, VISIBILITIES } from '../constants.js';
import {
  enumOf,
  isoDate,
  nullable,
  number,
  object,
  objectId,
  partial,
  string,
  url,
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

/** Registers the uploaded blob. New assets are private by default. */
export const assetCreateShape = {
  featureId: withDefault(nullable(objectId()), null),
  kind: enumOf(ASSET_KINDS),
  blobUrl: url(),
  thumbnailUrl: withDefault(nullable(url()), null),
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
  visibility: withDefault(enumOf(VISIBILITIES), 'private' as const),
  sortOrder: withDefault(number({ integer: true }), 0),
  capturedAt: withDefault(nullable(isoDate()), null),
};

export const assetCreateSchema = object(assetCreateShape);
export const assetUpdateSchema = partial(assetCreateShape);

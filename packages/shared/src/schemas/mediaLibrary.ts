import { MEDIA_KINDS, MEDIA_SVG_MAX_LENGTH } from '../constants.js';
import {
  boolean,
  enumOf,
  nullable,
  number,
  object,
  partial,
  slug,
  string,
  url,
  withDefault,
} from '../validate.js';

/**
 * `mediaLibrary` — the reusable marks the public site draws from.
 *
 * What this schema does *not* do is make `svg` safe. It checks the string looks
 * like an SVG element and is not enormous; the stripping happens in the API's
 * service layer, on create and on update, because that is the only gate the
 * render path has (CLAUDE.md §8).
 */

/**
 * The fields themselves, with no opinion about what happens when one is absent.
 * Create and update disagree about that, so they each wrap this differently.
 */
const mediaLibraryFields = {
  kind: enumOf(MEDIA_KINDS),
  /**
   * Stable and lowercase. Projects and `siteContent` point at marks by this, so
   * it is the closest thing the library has to a primary key.
   */
  key: slug(),
  label: string({ min: 1, max: 120 }),
  /** Inline markup, sanitised before write. Empty until someone pastes a mark in. */
  svg: string({ max: MEDIA_SVG_MAX_LENGTH, allowEmpty: true, pattern: /^<svg[\s>]/i }),
  /** The alternative to `svg`, for marks only available as raster. */
  blobUrl: nullable(url()),
  /** The trademark gate. `false` drops the mark from every published surface. */
  usageApproved: boolean(),
  sortOrder: number({ integer: true }),
};

/** On create, everything but `kind`, `key` and `label` has a sensible starting value. */
export const mediaLibraryCreateShape = {
  ...mediaLibraryFields,
  svg: withDefault(mediaLibraryFields.svg, ''),
  blobUrl: withDefault(mediaLibraryFields.blobUrl, null),
  usageApproved: withDefault(mediaLibraryFields.usageApproved, true),
  sortOrder: withDefault(mediaLibraryFields.sortOrder, 0),
};

export const mediaLibraryCreateSchema = object(mediaLibraryCreateShape);

/**
 * The PATCH counterpart is built from the bare fields rather than from the
 * create shape, and the difference matters: a create default turns an absent
 * key into a *value*, which on an update would write that default over whatever
 * is already stored. Sending `{}` here is rejected instead, and sending one
 * field changes one field.
 */
export const mediaLibraryUpdateSchema = partial(mediaLibraryFields);

import { MEDIA_SVG_MAX_LENGTH } from '../../constants.js';
import {
  arrayOf,
  nullable,
  slug,
  strictObject,
  string,
  url,
  withDefault,
  type Infer,
  type Validator,
} from '../../validate.js';

/**
 * Pieces more than one page's `data` needs.
 *
 * Everything here tolerates the empty string. A draft is half-written by
 * nature — refusing to save a page because a social row has no URL yet would
 * make the editor unusable for the ten minutes it takes to write a page.
 */

/** An http(s) URL, or nothing yet. */
export function optionalUrl(): Validator<string> {
  const inner = url();

  return {
    run(input, path, issues) {
      if (typeof input === 'string' && input.trim() === '') return '';
      return inner.run(input, path, issues);
    },
  };
}

/**
 * An email address, or nothing yet.
 *
 * Loose on purpose, matching `enquiries`: a stricter pattern rejects addresses
 * that genuinely work, and this one is displayed rather than delivered to.
 */
export function optionalEmail(): Validator<string> {
  const inner = string({ min: 3, max: 200, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ });

  return {
    run(input, path, issues) {
      if (typeof input === 'string' && input.trim() === '') return '';
      return inner.run(input, path, issues);
    },
  };
}

/**
 * A `mediaLibrary` key, or nothing yet.
 *
 * The same tolerance `optionalUrl` and `optionalEmail` have, for the same
 * reason: a stat row is typed before its glyph is drawn, and refusing to save
 * the page until somebody has been to the library and back makes the editor
 * unusable for the ten minutes in between. An empty key resolves to no mark,
 * which the row renders as no icon (CLAUDE.md §7.4).
 */
export function optionalSlug(): Validator<string> {
  const inner = slug();

  return {
    run(input, path, issues) {
      if (typeof input === 'string' && input.trim() === '') return '';
      return inner.run(input, path, issues);
    },
  };
}

/**
 * One social row: which mark to draw, and where it points.
 *
 * `mediaKey` is a `mediaLibrary.key` — a key, not a label, and not an icon
 * pasted into a component (CLAUDE.md §7.3).
 */
export const socialShape = {
  /**
   * Empty until a mark is chosen, like every other key in a draft: the row is
   * added from the editor before it is filled in, and rejecting the save in
   * between is what made adding one impossible. A row with no mark chosen is
   * one the page does not draw.
   */
  mediaKey: withDefault(optionalSlug(), ''),
  url: withDefault(optionalUrl(), ''),
};

/**
 * A mark as a published page carries it — the same three fields a project's
 * snapshot holds for its tech stack, for the same reason: the portfolio may
 * never read `mediaLibrary` (§6, §8), so a key has to arrive already resolved
 * or it arrives as a string nobody can draw.
 *
 * `svg` is not pattern-checked here. It is not markup anyone posted: the
 * publish action writes it, having read it from a record the API sanitised on
 * write, which is the gate the render path depends on (§8).
 */
export const resolvedMarkShape = {
  key: slug(),
  label: withDefault(string({ max: 120, allowEmpty: true }), ''),
  svg: withDefault(string({ max: MEDIA_SVG_MAX_LENGTH, allowEmpty: true }), ''),
};

export type SiteContentMark = Infer<typeof resolvedMarkShape>;

/**
 * `data.marks` — every mark the page's keys resolved to, deduplicated.
 *
 * Server-owned. The publish action fills it and the draft never carries it, so
 * a `marks` array sent to `PATCH /api/content/:key` is dropped rather than
 * stored: the only markup that reaches a published page comes from the library
 * by way of `resolveMarks`, never from a request body.
 *
 * It lives on the page rather than beside each key because two rows can name
 * the same mark, and because the draft's shape then stays exactly what somebody
 * edits — a key and a URL.
 */
export function marksField(): Validator<SiteContentMark[]> {
  return withDefault(arrayOf(strictObject(resolvedMarkShape), { max: 200 }), []);
}

/**
 * `data.portrait` — an image resolved out of `assets` at publish.
 *
 * Server-owned, exactly like `marks`: the draft holds `portraitAssetId`, which
 * is an id into an operational collection the portfolio may never read, and the
 * publish action turns it into public-container URLs. A `portrait` sent to
 * `PATCH /api/content/:key` is dropped rather than stored, so no request body
 * can point a public page at a blob nobody gated.
 *
 * The shape mirrors a project snapshot's `heroImage`, because it is the same
 * thing arrived at the same way — and the page picks a variant per slot rather
 * than serving the original (§10).
 */
const variantsShape = {
  thumb: withDefault(nullable(string({ max: 600, allowEmpty: true })), null),
  card: withDefault(nullable(string({ max: 600, allowEmpty: true })), null),
  hero: withDefault(nullable(string({ max: 600, allowEmpty: true })), null),
};

export const publishedImageShape = {
  url: string({ min: 1, max: 600 }),
  alt: withDefault(string({ max: 500, allowEmpty: true }), ''),
  variants: withDefault(nullable(strictObject(variantsShape)), null),
};

export type SiteContentImage = Infer<typeof publishedImageShape>;

export function portraitField(): Validator<SiteContentImage | null> {
  return withDefault(nullable(strictObject(publishedImageShape)), null);
}

/**
 * `data.cv` — the file the hero's second button hands to a visitor.
 *
 * Server-owned in exactly the way `portrait` is, and for the same reason: the
 * draft names `cvAssetId`, an id into `assets`, which the portfolio may never
 * read. Publishing runs the site asset gate, copies the blob into the public
 * container and writes the resulting URL here, so a public page can only ever
 * point at bytes a gate let through (§6, §8).
 *
 * It carries no `variants`. `sharp` makes variants of images, and this is a
 * document — the one file is the whole of it. `filename` is what the browser
 * saves it as, so a download does not land as a content-addressed blob name.
 */
export const publishedFileShape = {
  url: string({ min: 1, max: 600 }),
  filename: withDefault(string({ max: 260, allowEmpty: true }), ''),
};

export type SiteContentFile = Infer<typeof publishedFileShape>;

export function cvField(): Validator<SiteContentFile | null> {
  return withDefault(nullable(strictObject(publishedFileShape)), null);
}

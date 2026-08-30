import { arrayOf, nullable, objectId, slug, strictObject, string, withDefault } from '../../validate.js';
import { marksField, optionalSlug, portraitField, socialShape } from './shared.js';

/**
 * `siteContent.about.data`.
 *
 * The narrative is still `body` — markdown, written and edited as prose, and
 * the one part of this page that is genuinely just writing. Everything here is
 * what markdown cannot express: a terminal session, four labelled tiles, a row
 * of marks, a band of counts, a timeline and a CTA with a social row.
 *
 * Every heading on the page is a field too. A section label written into the
 * component would be copy in this repo, which §2 rule 8 forbids — so "My
 * Philosophy" and "What Drives Me" are typed in the portal like everything
 * else, and a section with no label renders its content without one.
 *
 * The shapes deliberately repeat `landing`'s rather than improving on them:
 * `terminalLines`, `techMarks` and `stats` are the same three fields, so the
 * portal's editors and the publish action's key sweep already know what to do
 * with them.
 *
 * Strict, for the same reason the landing schema is: a key this page has no
 * field for is a 400 naming it, not a silent drop.
 */

/**
 * A decorative glyph beside a tile, a count or a driver.
 *
 * `kind: "stat"` in the library, which is where these already live — the kind
 * exists precisely for marks that are neither a logo, a platform nor anybody's
 * trademark, and nothing in the render path treats it specially
 * (docs/DATA_MODEL.md). A new kind for the same thing under a different name
 * would only make the portal's picker longer.
 *
 * Optional, like a stat row's: a card can be written before its glyph is drawn,
 * and until it is, the card renders without one rather than not at all.
 */
const glyphKey = () => withDefault(optionalSlug(), '');

export const aboutDataSchema = strictObject({
  headline: withDefault(string({ max: 200, allowEmpty: true }), ''),
  /** The line under the headline — "Developer. Builder. Problem Solver." */
  subtitle: withDefault(string({ max: 200, allowEmpty: true }), ''),

  /**
   * The terminal beside the intro. Decorative, and hidden below `lg` exactly as
   * the landing page's is (§7.7) — a phone gets the words instead.
   */
  terminalLines: withDefault(arrayOf(string({ max: 200, allowEmpty: true }), { max: 40 }), []),
  terminalTitle: withDefault(string({ max: 60, allowEmpty: true }), ''),

  /**
   * The four tiles under the intro — experience, location, role, focus.
   *
   * `label` and `value` rather than a fixed set of named fields: which four
   * facts belong here is an editorial decision, and a schema that named them
   * would need a migration to say a fifth thing.
   */
  infoCards: withDefault(
    arrayOf(
      strictObject({
        mediaKey: glyphKey(),
        label: string({ min: 1, max: 40 }),
        value: string({ min: 1, max: 80 }),
      }),
      { max: 6 },
    ),
    [],
  ),

  philosophy: withDefault(
    strictObject({
      label: withDefault(string({ max: 80, allowEmpty: true }), ''),
      body: withDefault(string({ max: 800, allowEmpty: true }), ''),
    }),
    { label: '', body: '' },
  ),

  /** The same pair the landing hero carries, for the same row of marks. */
  techLabel: withDefault(string({ max: 60, allowEmpty: true }), ''),
  techMarks: withDefault(arrayOf(slug(), { max: 12 }), []),

  exploring: withDefault(
    strictObject({
      label: withDefault(string({ max: 80, allowEmpty: true }), ''),
      items: withDefault(arrayOf(string({ min: 1, max: 160 }), { max: 10 }), []),
    }),
    { label: '', items: [] },
  ),

  /**
   * The band of counts. Written, not measured — Wroom counts no clients and
   * times no career, and a public page is the wrong place for it to start.
   */
  stats: withDefault(
    arrayOf(
      strictObject({
        mediaKey: glyphKey(),
        value: string({ min: 1, max: 12 }),
        label: string({ min: 1, max: 40 }),
      }),
      { max: 6 },
    ),
    [],
  ),

  driversLabel: withDefault(string({ max: 80, allowEmpty: true }), ''),
  drivers: withDefault(
    arrayOf(
      strictObject({
        mediaKey: glyphKey(),
        title: string({ min: 1, max: 60 }),
        body: withDefault(string({ max: 400, allowEmpty: true }), ''),
      }),
      { max: 8 },
    ),
    [],
  ),

  journeyLabel: withDefault(string({ max: 80, allowEmpty: true }), ''),
  /**
   * `year` is a string rather than a number. It is a caption on a timeline —
   * "2019", but equally "2021–22" — and nothing counts, sorts or does
   * arithmetic on it. The order is the order they are written in.
   */
  journey: withDefault(
    arrayOf(
      strictObject({
        year: string({ min: 1, max: 12 }),
        event: string({ min: 1, max: 300 }),
      }),
      { max: 24 },
    ),
    [],
  ),

  /**
   * The bar at the foot of the page.
   *
   * `ctaLabel` is a label only — the button goes to `/contact`, fixed in the
   * page, because an authored href on a public page is a link nobody reviews.
   * That is the same rule the landing hero's buttons follow. The social row
   * beside it does carry URLs, exactly as the landing page's does.
   */
  ctaHeadline: withDefault(string({ max: 200, allowEmpty: true }), ''),
  ctaBody: withDefault(string({ max: 400, allowEmpty: true }), ''),
  ctaLabel: withDefault(string({ max: 80, allowEmpty: true }), ''),
  socials: withDefault(arrayOf(strictObject(socialShape), { max: 12 }), []),

  portraitAssetId: withDefault(nullable(objectId()), null),
  /** Both written by the publish action, never by an editor. */
  portrait: portraitField(),
  marks: marksField(),
});

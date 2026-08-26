import { arrayOf, nullable, number, objectId, strictObject, string, withDefault } from '../../validate.js';
import { marksField, portraitField, socialShape } from './shared.js';

/**
 * `siteContent.landing.data` — the hero of the public landing page.
 *
 * Markdown alone cannot express a greeting, an accent-coloured name, a
 * discipline list and a CTA label as separate things, which is what `data` is
 * for. The prose that goes around them is `body`.
 *
 * Strict: a key this page has no field for is a 400 naming it, not a silent
 * drop. Posting another page's shape here has to fail loudly, or a landing
 * record quietly saves as an empty one.
 */
export const landingDataSchema = strictObject({
  greeting: withDefault(string({ max: 80, allowEmpty: true }), ''),
  name: withDefault(string({ max: 80, allowEmpty: true }), ''),
  statement: withDefault(string({ max: 300, allowEmpty: true }), ''),
  disciplines: withDefault(arrayOf(string({ min: 1, max: 40 }), { max: 12 }), []),
  badge: withDefault(
    strictObject({
      title: withDefault(string({ max: 80, allowEmpty: true }), ''),
      body: withDefault(string({ max: 300, allowEmpty: true }), ''),
    }),
    { title: '', body: '' },
  ),
  /** Decorative, and hidden below `md` (docs/DATA_MODEL.md). */
  terminalLines: withDefault(arrayOf(string({ max: 200, allowEmpty: true }), { max: 20 }), []),
  /**
   * The pane of source beside the terminal. Decorative, and hidden below `lg`.
   *
   * `tabs` are the file names along its top and `code` is what it shows —
   * rendered as text, never highlighted and never as markup.
   */
  codePanel: withDefault(
    strictObject({
      tabs: withDefault(arrayOf(string({ min: 1, max: 40 }), { max: 6 }), []),
      code: withDefault(string({ max: 2000, allowEmpty: true }), ''),
    }),
    { tabs: [], code: '' },
  ),
  /**
   * The small readout under the code pane. Decorative, hidden below `lg`, and
   * authored: Wroom measures nothing about this machine and a public page is
   * the wrong place to start.
   */
  statusRows: withDefault(
    arrayOf(
      strictObject({
        label: string({ min: 1, max: 24 }),
        value: withDefault(string({ max: 24, allowEmpty: true }), ''),
      }),
      { max: 6 },
    ),
    [],
  ),
  socials: withDefault(arrayOf(strictObject(socialShape), { max: 12 }), []),
  ctaLabel: withDefault(string({ max: 80, allowEmpty: true }), ''),
  /** The line under the featured work heading. */
  featuredIntro: withDefault(string({ max: 200, allowEmpty: true }), ''),
  /** How many published projects the landing page shows. */
  featuredLimit: withDefault(number({ min: 1, max: 24, integer: true }), 6),
  /**
   * The cut-out beside the headline. An `assets` id in the draft; the publish
   * action resolves it into `portrait` below, and the portfolio only ever sees
   * that (§6, §8).
   */
  portraitAssetId: withDefault(nullable(objectId()), null),
  /** Both written by the publish action, never by an editor. */
  marks: marksField(),
  portrait: portraitField(),
});

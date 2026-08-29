import { arrayOf, nullable, number, objectId, slug, strictObject, string, withDefault } from '../../validate.js';
import { cvField, marksField, optionalSlug, portraitField, socialShape } from './shared.js';

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
  /**
   * The pill above the headline — "Full stack developer".
   *
   * Not `badge`, which is the panel beside the terminal, and not a discipline:
   * this is the one line that says what you are, where the disciplines are the
   * list of what you do.
   */
  role: withDefault(string({ max: 60, allowEmpty: true }), ''),
  greeting: withDefault(string({ max: 80, allowEmpty: true }), ''),
  name: withDefault(string({ max: 80, allowEmpty: true }), ''),
  statement: withDefault(string({ max: 300, allowEmpty: true }), ''),
  disciplines: withDefault(arrayOf(string({ min: 1, max: 40 }), { max: 12 }), []),
  /**
   * The two buttons under the statement.
   *
   * Labels only. Where each one goes is fixed — the first at the work index,
   * the second at the CV below — because an authored href on a public page is a
   * link nobody reviews, and neither destination is a choice anybody needs to
   * make from the portal.
   *
   * Either label empty is that button not drawn (§7.4). The second one also
   * needs a CV: a download button with no file behind it does not render.
   */
  heroPrimaryLabel: withDefault(string({ max: 40, allowEmpty: true }), ''),
  heroSecondaryLabel: withDefault(string({ max: 40, allowEmpty: true }), ''),
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
   * The session name in the terminal's window bar. Decorative like the lines
   * under it, and empty means a bar with the lights and no caption.
   */
  terminalTitle: withDefault(string({ max: 60, allowEmpty: true }), ''),
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
  /**
   * The row of marks under the hero buttons, and the line that labels it.
   *
   * Keys only — what is drawn and what it is called both come from the
   * `mediaLibrary` record, the same as a project's tech stack, so a logo is
   * corrected in one place rather than everywhere it appears (§7.3).
   */
  techLabel: withDefault(string({ max: 60, allowEmpty: true }), ''),
  techMarks: withDefault(arrayOf(slug(), { max: 12 }), []),
  /**
   * The band of counts under the hero.
   *
   * Written, not measured — Wroom counts no clients and times no career, and a
   * public page is the wrong place for it to start. These say what was typed
   * until somebody types something else, exactly like `statusRows`.
   *
   * `mediaKey` tolerates the empty string so a row can be written before its
   * glyph is drawn; that row renders as a count with no icon.
   */
  stats: withDefault(
    arrayOf(
      strictObject({
        mediaKey: withDefault(optionalSlug(), ''),
        value: string({ min: 1, max: 12 }),
        label: string({ min: 1, max: 40 }),
      }),
      { max: 6 },
    ),
    [],
  ),
  socials: withDefault(arrayOf(strictObject(socialShape), { max: 12 }), []),
  ctaLabel: withDefault(string({ max: 80, allowEmpty: true }), ''),
  /**
   * The pill on the right of the site header.
   *
   * Its own field rather than `ctaLabel`, which is the bar at the foot of the
   * page: that one is a sentence and this one has to fit in a pill. Both point
   * at the contact page; only the words differ.
   */
  headerCtaLabel: withDefault(string({ max: 40, allowEmpty: true }), ''),
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
  /**
   * The file behind the second hero button. An `assets` id in the draft, the
   * same as the portrait, and resolved into `cv` below at publish.
   */
  cvAssetId: withDefault(nullable(objectId()), null),
  /** All three written by the publish action, never by an editor. */
  marks: marksField(),
  portrait: portraitField(),
  cv: cvField(),
});

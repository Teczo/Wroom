import { arrayOf, number, strictObject, string, withDefault } from '../../validate.js';
import { marksField, socialShape } from './shared.js';

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
  socials: withDefault(arrayOf(strictObject(socialShape), { max: 12 }), []),
  ctaLabel: withDefault(string({ max: 80, allowEmpty: true }), ''),
  /** How many published projects the landing page shows. */
  featuredLimit: withDefault(number({ min: 1, max: 24, integer: true }), 6),
  /** Written by the publish action, never by an editor. See `marksField`. */
  marks: marksField(),
});

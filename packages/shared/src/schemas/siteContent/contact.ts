import { arrayOf, strictObject, string, withDefault } from '../../validate.js';
import { marksField, optionalEmail, socialShape } from './shared.js';

/**
 * `siteContent.contact.data`.
 *
 * The address shown on the page. The enquiry form does not read this — it
 * posts to `/public/enquiries`, which is a different path with its own
 * middleware chain (CLAUDE.md §8).
 */
export const contactDataSchema = strictObject({
  headline: withDefault(string({ max: 200, allowEmpty: true }), ''),
  intro: withDefault(string({ max: 1000, allowEmpty: true }), ''),
  email: withDefault(optionalEmail(), ''),
  socials: withDefault(arrayOf(strictObject(socialShape), { max: 12 }), []),
  /** Written by the publish action, never by an editor. See `marksField`. */
  marks: marksField(),
});

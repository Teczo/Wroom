import { nullable, objectId, strictObject, string, withDefault } from '../../validate.js';
import { portraitField } from './shared.js';

/**
 * `siteContent.about.data`.
 *
 * Deliberately two fields. The narrative is `body` — markdown, written and
 * edited as prose — and putting it in `data` would mean structuring something
 * that is genuinely just writing.
 */
export const aboutDataSchema = strictObject({
  headline: withDefault(string({ max: 200, allowEmpty: true }), ''),
  portraitAssetId: withDefault(nullable(objectId()), null),
  /** Written by the publish action, never by an editor. See `portraitField`. */
  portrait: portraitField(),
});

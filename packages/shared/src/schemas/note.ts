import { NOTE_KINDS } from '../constants.js';
import { boolean, enumOf, nullable, object, objectId, partial, string, withDefault } from '../validate.js';

/**
 * `authorUserId` and `visibility` are deliberately absent.
 *
 * The author comes from the Auth0 subject on the request, so accepting one in
 * the body would let a caller write a note as someone else. Visibility defaults
 * to private on the model and nothing in WRM-018 reads it, so there is nothing
 * to set yet either.
 */
export const noteCreateShape = {
  body: string({ min: 1, max: 20000 }),
  kind: withDefault(enumOf(NOTE_KINDS), 'note' as const),
  featureId: withDefault(nullable(objectId()), null),
  pinned: withDefault(boolean(), false),
};

export const noteCreateSchema = object(noteCreateShape);
export const noteUpdateSchema = partial(noteCreateShape);

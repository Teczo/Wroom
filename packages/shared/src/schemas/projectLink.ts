import { PROJECT_LINK_TYPES } from '../constants.js';
import { enumOf, object, objectId, partial, string, withDefault } from '../validate.js';

/**
 * A link is created from the project whose page you are on, so only the far end
 * is in the body — `fromProjectId` comes from the route.
 */
export const projectLinkCreateShape = {
  toProjectId: objectId(),
  type: enumOf(PROJECT_LINK_TYPES),
  note: withDefault(string({ max: 500, allowEmpty: true }), ''),
};

export const projectLinkCreateSchema = object(projectLinkCreateShape);

/** Only the type and the note can change — the two ends of a link cannot move. */
export const projectLinkUpdateShape = {
  type: enumOf(PROJECT_LINK_TYPES),
  note: withDefault(string({ max: 500, allowEmpty: true }), ''),
};

export const projectLinkUpdateSchema = partial(projectLinkUpdateShape);

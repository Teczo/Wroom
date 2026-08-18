import { DECISION_STATUSES } from '../constants.js';
import {
  enumOf,
  isoDate,
  nullable,
  object,
  objectId,
  partial,
  string,
  withDefault,
} from '../validate.js';

/**
 * `authorUserId` is absent on purpose — it comes from the Auth0 subject on the
 * request, so accepting one in the body would let a caller record a decision as
 * somebody else. There is no `updatedAt` either; the model does not define one.
 */
export const decisionCreateShape = {
  title: string({ min: 1, max: 200 }),
  context: withDefault(string({ max: 8000, allowEmpty: true }), ''),
  decision: withDefault(string({ max: 8000, allowEmpty: true }), ''),
  alternativesRejected: withDefault(string({ max: 8000, allowEmpty: true }), ''),
  status: withDefault(enumOf(DECISION_STATUSES), 'proposed' as const),
  supersededByDecisionId: withDefault(nullable(objectId()), null),
  decidedAt: withDefault(nullable(isoDate()), null),
};

export const decisionCreateSchema = object(decisionCreateShape);
export const decisionUpdateSchema = partial(decisionCreateShape);

/** The body of `POST /api/decisions/:id/supersede`. */
export const decisionSupersedeSchema = object({
  supersededByDecisionId: objectId(),
});

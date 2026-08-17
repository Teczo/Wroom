import {
  FEATURE_PRIORITIES,
  FEATURE_SIZES,
  FEATURE_SOURCES,
  FEATURE_STATUSES,
} from '../constants.js';
import {
  arrayOf,
  enumOf,
  nullable,
  number,
  object,
  objectId,
  optional,
  partial,
  string,
  url,
  withDefault,
} from '../validate.js';

export const featureCreateShape = {
  ref: string({ min: 2, max: 40, pattern: /^[A-Z][A-Z0-9]*-\d+$/ }),
  title: string({ min: 1, max: 200 }),
  description: withDefault(string({ max: 8000, allowEmpty: true }), ''),
  acceptanceCriteria: withDefault(string({ max: 2000, allowEmpty: true }), ''),
  status: withDefault(enumOf(FEATURE_STATUSES), 'backlog' as const),
  priority: withDefault(enumOf(FEATURE_PRIORITIES), 'medium' as const),
  size: withDefault(enumOf(FEATURE_SIZES), 'm' as const),
  /** Omit to append to the end of the column. */
  order: optional(number({ min: 0 })),
  assigneeUserId: withDefault(nullable(objectId()), null),
  labels: withDefault(arrayOf(string({ min: 1, max: 40 }), { max: 20 }), []),
  dependsOnFeatureIds: withDefault(arrayOf(objectId(), { max: 50 }), []),
  branch: withDefault(nullable(string({ max: 200 })), null),
  prUrl: withDefault(nullable(url()), null),
  blockedReason: withDefault(nullable(string({ max: 500 })), null),
  source: withDefault(enumOf(FEATURE_SOURCES), 'manual' as const),
  externalKey: withDefault(nullable(string({ max: 200 })), null),
};

export const featureCreateSchema = object(featureCreateShape);
export const featureUpdateSchema = partial(featureCreateShape);

/** Body for PATCH /api/projects/:projectId/features/:id/move — Kanban drag. */
export const featureMoveSchema = object({
  status: enumOf(FEATURE_STATUSES),
  order: number({ min: 0 }),
});

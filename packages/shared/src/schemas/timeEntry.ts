import { TIME_ACTIVITIES } from '../constants.js';
import {
  boolean,
  enumOf,
  isoDate,
  nullable,
  number,
  object,
  objectId,
  partial,
  string,
  withDefault,
} from '../validate.js';

export const timeEntryCreateShape = {
  featureId: withDefault(nullable(objectId()), null),
  /** Day granularity — there is no start/stop timer. */
  date: isoDate(),
  hours: number({ min: 0.25, max: 24 }),
  activity: enumOf(TIME_ACTIVITIES),
  note: withDefault(string({ max: 1000, allowEmpty: true }), ''),
  billable: withDefault(boolean(), false),
};

export const timeEntryCreateSchema = object(timeEntryCreateShape);
export const timeEntryUpdateSchema = partial(timeEntryCreateShape);

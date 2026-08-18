import { BILLING_CYCLES, COST_SOURCES, VENDORS } from '../constants.js';
import {
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

export const costCreateShape = {
  serviceId: withDefault(nullable(objectId()), null),
  accountId: withDefault(nullable(objectId()), null),
  vendor: enumOf(VENDORS),
  description: string({ min: 1, max: 300 }),
  amount: number({ min: 0 }),
  currency: withDefault(string({ min: 3, max: 3, pattern: /^[A-Z]{3}$/ }), 'AUD'),
  /** Converted at entry. When currency is AUD the service copies `amount`. */
  amountAud: withDefault(nullable(number({ min: 0 })), null),
  fxRate: withDefault(nullable(number({ min: 0 })), null),
  billingCycle: enumOf(BILLING_CYCLES),
  periodStart: withDefault(nullable(isoDate()), null),
  periodEnd: withDefault(nullable(isoDate()), null),
  source: withDefault(enumOf(COST_SOURCES), 'manual' as const),
  externalId: withDefault(nullable(string({ max: 200 })), null),
};

export const costCreateSchema = object(costCreateShape);
export const costUpdateSchema = partial(costCreateShape);

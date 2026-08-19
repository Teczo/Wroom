import { BASE_CURRENCY, MANUAL_REVENUE_SOURCES } from '../constants.js';
import {
  boolean,
  enumOf,
  isoDate,
  nullable,
  number,
  object,
  partial,
  string,
  withDefault,
} from '../validate.js';

/**
 * Manual revenue entry.
 *
 * AUD only. `docs/DATA_MODEL.md` gives `revenue` no `fxRate`, so there is
 * nowhere to record the rate a conversion used — and a converted figure with no
 * rate behind it is a number nobody can check later. A non-AUD invoice needs
 * the field added first, which is a schema decision.
 */
export const revenueCreateShape = {
  source: withDefault(enumOf(MANUAL_REVENUE_SOURCES), 'manual' as const),
  customerRef: withDefault(string({ max: 140, allowEmpty: true }), ''),
  description: string({ min: 1, max: 300 }),
  amount: number({ min: 0 }),
  currency: withDefault(enumOf([BASE_CURRENCY] as const), BASE_CURRENCY),
  paid: withDefault(boolean(), false),
  paidAt: withDefault(nullable(isoDate()), null),
  dueAt: withDefault(nullable(isoDate()), null),
  periodStart: withDefault(nullable(isoDate()), null),
  periodEnd: withDefault(nullable(isoDate()), null),
};

export const revenueCreateSchema = object(revenueCreateShape);
export const revenueUpdateSchema = partial(revenueCreateShape);

/** Body for the "mark as paid" action — the date it landed, nothing else. */
export const revenueMarkPaidSchema = object({
  paidAt: withDefault(nullable(isoDate()), null),
});

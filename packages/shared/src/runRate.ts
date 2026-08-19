import type { BillingCycle } from './constants.js';

/**
 * The run-rate rule (docs/DATA_MODEL.md).
 *
 * Monthly run-rate = monthly costs + annual costs ÷ 12. One-off and usage are
 * excluded: a one-off purchase is not a recurring commitment, and usage is not
 * knowable in advance.
 *
 * This is the one implementation of that arithmetic. The rollup and the
 * portfolio summary both call it — grep for `/ 12` and it appears here only.
 */

/** Cycles that recur, and so contribute to what a month costs. */
export const RUN_RATE_CYCLES: readonly BillingCycle[] = ['monthly', 'annual'];

export function countsTowardRunRate(cycle: string): boolean {
  return (RUN_RATE_CYCLES as readonly string[]).includes(cycle);
}

/** Money is stored and reported to the cent; nothing here carries more. */
export function roundAud(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * @param totalsByCycle Summed `amountAud` per billing cycle. A missing or
 *   null entry contributes zero rather than breaking the total.
 */
export function monthlyRunRate(
  totalsByCycle: Partial<Record<BillingCycle, number | null>>,
): number {
  const monthly = totalsByCycle.monthly ?? 0;
  const annual = totalsByCycle.annual ?? 0;

  return roundAud(monthly + annual / 12);
}

/** Everything spent, whatever the cycle — one-offs and usage included. */
export function totalSpend(totalsByCycle: Partial<Record<BillingCycle, number | null>>): number {
  return roundAud(
    Object.values(totalsByCycle).reduce((sum: number, value) => sum + (value ?? 0), 0),
  );
}

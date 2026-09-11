/**
 * The budget slider's stops.
 *
 * Not a linear range, on purpose. A single step across nought to a million is
 * twenty thousand dollars wide, which makes every small budget impossible to
 * express and every large one falsely precise. So the steps grow with the
 * number: two and a half thousand at the bottom, ten thousand through the
 * middle, fifty at the top. The slider's position is an index into this list,
 * which is also why it needs no rounding — every reachable value is a value
 * somebody would actually say out loud.
 */
function buildStops(): number[] {
  const stops: number[] = [];
  for (let value = 0; value <= 50_000; value += 2_500) stops.push(value);
  for (let value = 60_000; value <= 200_000; value += 10_000) stops.push(value);
  for (let value = 250_000; value <= 1_000_000; value += 50_000) stops.push(value);
  return stops;
}

export const BUDGET_STOPS = buildStops();
export const BUDGET_MAX_INDEX = BUDGET_STOPS.length - 1;

/** Where the handle sits before it is touched — a mid-size project, not zero. */
export const BUDGET_DEFAULT_INDEX = BUDGET_STOPS.indexOf(25_000);

/**
 * What gets stored, and what is shown above the slider — the same string, so
 * the figure a visitor read is the figure that arrives in the enquiry. The top
 * stop carries a `+` because a slider cannot say "or more" any other way.
 */
export function formatBudget(value: number): string {
  const amount = new Intl.NumberFormat('en-AU').format(value);
  return value >= 1_000_000 ? `AUD ${amount}+` : `AUD ${amount}`;
}

/** The figure at a slider position, clamped rather than trusted. */
export function budgetAt(index: number): number {
  return BUDGET_STOPS[Math.min(Math.max(index, 0), BUDGET_MAX_INDEX)] ?? 0;
}

/** The answer for somebody who has not costed it yet, which is most people. */
export const BUDGET_UNSURE = 'Not sure yet';

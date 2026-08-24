import { landingDataSchema, validate, type Validator } from '@wroom/shared';

/**
 * The `landing` record's structured half, typed and defaulted.
 *
 * The field set is not restated here — the type is read straight off the schema
 * in `packages/shared/src/schemas/siteContent/landing.ts`, so a field added
 * there is a type error in the hero until it is rendered. Running the schema is
 * also how the defaults are obtained: a seeded record holds `{}` until somebody
 * writes the page, and every field has to come back empty rather than absent.
 */
type Shape<V> = V extends Validator<infer T> ? T : never;

export type LandingData = Shape<typeof landingDataSchema>;

/**
 * Reads a stored `data` blob into the shape the page renders.
 *
 * `undefined` — nothing published yet, or the record still loading — parses as
 * an empty page rather than a failure: every field comes back empty and every
 * section of the hero decides for itself that it has nothing to show (§7.4).
 *
 * Null is the one thing that cannot be rendered: a blob that fails the schema
 * the API validated it against is not a page, and guessing at what it meant is
 * worse than showing nothing.
 */
export function readLandingData(stored: unknown): LandingData | null {
  const parsed = validate(landingDataSchema, stored ?? {});
  return parsed.ok ? parsed.value : null;
}

/**
 * How many projects the row falls back to when the record cannot be read.
 *
 * Mirrors `featuredLimit`'s default in the schema, and is only ever reached by
 * the null case above — an authored value always wins.
 */
export const FALLBACK_FEATURED_LIMIT = 6;

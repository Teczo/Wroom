import {
  aboutDataSchema,
  contactDataSchema,
  skillsDataSchema,
  validate,
  type Validator,
} from '@wroom/shared';

/**
 * The structured half of the three content records this site renders, typed
 * and defaulted.
 *
 * The field sets are not restated here — each type is read straight off the
 * schema in `packages/shared/src/schemas/siteContent/`, so a field added there
 * is a type error in the page until it is rendered. Running the schema is also
 * how the defaults are obtained: a seeded record holds `{}` until somebody
 * writes the page, and every field has to come back empty rather than absent.
 *
 * This mirrors `features/landing/landingData.ts` deliberately. Same shape of
 * problem, same shape of answer.
 */
type Shape<V> = V extends Validator<infer T> ? T : never;

export type AboutData = Shape<typeof aboutDataSchema>;
export type SkillsData = Shape<typeof skillsDataSchema>;
export type ContactData = Shape<typeof contactDataSchema>;

/**
 * `undefined` — a record published before this page had a `data` half — parses
 * as an empty page rather than a failure: every field comes back empty and
 * every section decides for itself that it has nothing to show (§7.4).
 *
 * Null is the one thing that cannot be rendered. A blob that fails the schema
 * the API validated it against is not a page, and guessing at what it meant is
 * worse than showing nothing.
 */
export function readAboutData(stored: unknown): AboutData | null {
  const parsed = validate(aboutDataSchema, stored ?? {});
  return parsed.ok ? parsed.value : null;
}

export function readSkillsData(stored: unknown): SkillsData | null {
  const parsed = validate(skillsDataSchema, stored ?? {});
  return parsed.ok ? parsed.value : null;
}

export function readContactData(stored: unknown): ContactData | null {
  const parsed = validate(contactDataSchema, stored ?? {});
  return parsed.ok ? parsed.value : null;
}

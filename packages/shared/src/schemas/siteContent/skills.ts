import { arrayOf, slug, strictObject, string, withDefault } from '../../validate.js';

/**
 * `siteContent.skills.data` — icon and label, grouped.
 *
 * No proficiency level, no years, no per-item prose. That is a deliberate
 * omission in docs/DATA_MODEL.md, not a field list waiting to be finished:
 * a self-assessed "expert" badge tells a visitor nothing they will believe.
 */
export const skillsDataSchema = strictObject({
  groups: withDefault(
    arrayOf(
      strictObject({
        label: string({ min: 1, max: 80 }),
        items: withDefault(
          arrayOf(
            strictObject({
              /** A `mediaLibrary.key` — the same library the tech grids use. */
              mediaKey: slug(),
              label: withDefault(string({ max: 80, allowEmpty: true }), ''),
            }),
            { max: 40 },
          ),
          [],
        ),
      }),
      { max: 12 },
    ),
    [],
  ),
});

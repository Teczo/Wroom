import { FIELD_DEF_TYPES, SERVICE_ROLES } from '../constants.js';
import {
  anyValue,
  arrayOf,
  boolean,
  enumOf,
  nullable,
  number,
  object,
  partial,
  string,
  withDefault,
  type Issue,
  type Validator,
} from '../validate.js';

/**
 * Project types and their field definitions — the data behind the schema-driven
 * project forms.
 *
 * Rules that need to see several fields at once live here rather than in the
 * service: whether a field needs `options` depends on its own `type`, so it can
 * be judged from one field definition alone. Rules that need to see the whole
 * type — a duplicate field key, a `showIf` pointing at a sibling — are checked
 * in the service, where the rest of the definitions are in hand.
 */

const showIfSchema = object({
  /** The key of another field on the same type. Verified in the service. */
  field: string({ min: 1, max: 40 }),
  equals: anyValue(),
});

const baseFieldDefShape = {
  /** Becomes a key in `projects.details`, so it stays identifier-shaped. */
  key: string({ min: 1, max: 40, pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/ }),
  label: string({ min: 1, max: 80 }),
  type: enumOf(FIELD_DEF_TYPES),
  options: withDefault(arrayOf(string({ min: 1, max: 80 }), { max: 50 }), []),
  required: withDefault(boolean(), false),
  group: withDefault(string({ max: 60, allowEmpty: true }), ''),
  helpText: withDefault(string({ max: 300, allowEmpty: true }), ''),
  showIf: withDefault(nullable(showIfSchema), null),
};

const baseFieldDef = object(baseFieldDefShape);

export type FieldDefInput = {
  key: string;
  label: string;
  type: (typeof FIELD_DEF_TYPES)[number];
  options: string[];
  required: boolean;
  group: string;
  helpText: string;
  showIf: { field: string; equals: unknown } | null;
};

/** A choice field is meaningless without choices; anything else with options is a mistake. */
const CHOICE_TYPES = ['select', 'multiselect'];

export const fieldDefSchema: Validator<FieldDefInput> = {
  run(input, path, issues: Issue[]) {
    const value = baseFieldDef.run(input, path, issues) as FieldDefInput;
    const at = (child: string) => (path === '' ? child : `${path}.${child}`);

    if (CHOICE_TYPES.includes(value.type) && value.options.length === 0) {
      issues.push({
        path: at('options'),
        message: `a ${value.type} field needs at least one option`,
      });
    }

    if (!CHOICE_TYPES.includes(value.type) && value.options.length > 0) {
      issues.push({
        path: at('options'),
        message: `only select and multiselect fields take options, not ${value.type}`,
      });
    }

    return value;
  },
};

export const projectTypeCreateShape = {
  /** Lowercase and hyphen-separated. Cannot be changed once the type exists. */
  key: string({ min: 2, max: 40, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ }),
  label: string({ min: 1, max: 80 }),
  icon: withDefault(string({ max: 40, allowEmpty: true }), ''),
  sortOrder: withDefault(number({ min: 0, max: 10_000, integer: true }), 0),
  active: withDefault(boolean(), true),
  fieldDefs: withDefault(arrayOf(fieldDefSchema, { max: 60 }), []),
  expectedServiceRoles: withDefault(arrayOf(enumOf(SERVICE_ROLES), { max: 20 }), []),
  defaultTechStack: withDefault(
    object({
      frontend: withDefault(arrayOf(string({ min: 1, max: 60 }), { max: 30 }), []),
      backend: withDefault(arrayOf(string({ min: 1, max: 60 }), { max: 30 }), []),
    }),
    { frontend: [], backend: [] },
  ),
};

export const projectTypeCreateSchema = object(projectTypeCreateShape);
export const projectTypeUpdateSchema = partial(projectTypeCreateShape);

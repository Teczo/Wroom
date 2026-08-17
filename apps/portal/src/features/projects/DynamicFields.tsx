import type { FieldDef } from '@wroom/shared';

import { Field, inputClasses } from '../../components/Field';

/**
 * Renders a project type's `fieldDefs`.
 *
 * Nothing here is hardcoded per project type — adding a field to a type in the
 * database changes this form with no code change, which is the whole point of
 * `projectTypes.fieldDefs`.
 */

type Props = {
  fieldDefs: FieldDef[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
};

function isVisible(fieldDef: FieldDef, values: Record<string, unknown>): boolean {
  if (!fieldDef.showIf) return true;
  return values[fieldDef.showIf.field] === fieldDef.showIf.equals;
}

function groupsOf(fieldDefs: FieldDef[]): Array<[string, FieldDef[]]> {
  const groups = new Map<string, FieldDef[]>();

  for (const fieldDef of fieldDefs) {
    const name = fieldDef.group || 'Details';
    groups.set(name, [...(groups.get(name) ?? []), fieldDef]);
  }

  return [...groups.entries()];
}

function Input({ fieldDef, values, onChange }: Omit<Props, 'fieldDefs' | 'errors'> & { fieldDef: FieldDef }) {
  const id = `details-${fieldDef.key}`;
  const value = values[fieldDef.key];

  switch (fieldDef.type) {
    case 'textarea':
      return (
        <textarea
          id={id}
          rows={3}
          className={inputClasses}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(fieldDef.key, event.target.value)}
        />
      );

    case 'boolean':
      return (
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input
            id={id}
            type="checkbox"
            className="size-4 rounded border-slate-300"
            checked={value === true}
            onChange={(event) => onChange(fieldDef.key, event.target.checked)}
          />
          Yes
        </label>
      );

    case 'number':
      return (
        <input
          id={id}
          type="number"
          className={inputClasses}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) =>
            onChange(fieldDef.key, event.target.value === '' ? undefined : Number(event.target.value))
          }
        />
      );

    case 'date':
      return (
        <input
          id={id}
          type="date"
          className={inputClasses}
          value={typeof value === 'string' ? value.slice(0, 10) : ''}
          onChange={(event) => onChange(fieldDef.key, event.target.value || undefined)}
        />
      );

    case 'select':
      return (
        <select
          id={id}
          className={inputClasses}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(fieldDef.key, event.target.value || undefined)}
        >
          <option value="">Choose…</option>
          {fieldDef.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];

      return (
        <div id={id} className="flex flex-wrap gap-2">
          {fieldDef.options.map((option) => {
            const isOn = selected.includes(option);

            return (
              <button
                key={option}
                type="button"
                aria-pressed={isOn}
                onClick={() =>
                  onChange(
                    fieldDef.key,
                    isOn ? selected.filter((entry) => entry !== option) : [...selected, option],
                  )
                }
                className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                  isOn
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return (
        <input
          id={id}
          type={fieldDef.type === 'url' ? 'url' : 'text'}
          className={inputClasses}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(fieldDef.key, event.target.value || undefined)}
        />
      );
  }
}

export function DynamicFields({ fieldDefs, values, errors, onChange }: Props) {
  const visible = fieldDefs.filter((fieldDef) => isVisible(fieldDef, values));
  if (visible.length === 0) return null;

  return (
    <>
      {groupsOf(visible).map(([group, defs]) => (
        <fieldset key={group} className="space-y-4">
          <legend className="text-sm font-semibold text-slate-900">{group}</legend>
          {defs.map((fieldDef) => (
            <Field
              key={fieldDef.key}
              label={fieldDef.label}
              htmlFor={`details-${fieldDef.key}`}
              hint={fieldDef.helpText || undefined}
              required={fieldDef.required}
              error={errors[`details.${fieldDef.key}`]}
            >
              <Input fieldDef={fieldDef} values={values} onChange={onChange} />
            </Field>
          ))}
        </fieldset>
      ))}
    </>
  );
}

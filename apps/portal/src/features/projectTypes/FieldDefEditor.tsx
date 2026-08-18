import type { FieldDef, FieldDefType } from '@wroom/shared';
import { FIELD_DEF_TYPES } from '@wroom/shared';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';

/**
 * One field definition. `showIf` is picked from the type's other fields rather
 * than typed as JSON, so it cannot name something that does not exist.
 */

const CHOICE_TYPES: FieldDefType[] = ['select', 'multiselect'];

export function blankFieldDef(): FieldDef {
  return {
    key: '',
    label: '',
    type: 'text',
    options: [],
    required: false,
    group: '',
    helpText: '',
    showIf: null,
  };
}

/** The values a boolean field can be compared against, and everything else. */
function equalsOptions(target: FieldDef | undefined): string[] {
  if (!target) return [];
  if (target.type === 'boolean') return ['true', 'false'];
  return target.options;
}

function parseEquals(target: FieldDef | undefined, raw: string): unknown {
  if (target?.type === 'boolean') return raw === 'true';
  return raw;
}

export function FieldDefEditor({
  fieldDef,
  index,
  total,
  siblings,
  errors,
  onChange,
  onRemove,
  onMove,
}: {
  fieldDef: FieldDef;
  index: number;
  total: number;
  siblings: FieldDef[];
  errors: Record<string, string>;
  onChange: (next: FieldDef) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const id = (part: string) => `field-${index}-${part}`;
  const others = siblings.filter((sibling) => sibling.key !== fieldDef.key && sibling.key !== '');
  const showIfTarget = siblings.find((sibling) => sibling.key === fieldDef.showIf?.field);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Field {index + 1}
        </p>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" htmlFor={id('label')} required error={errors[`fieldDefs[${index}].label`]}>
          <input
            id={id('label')}
            className={inputClasses}
            value={fieldDef.label}
            onChange={(event) => onChange({ ...fieldDef, label: event.target.value })}
          />
        </Field>

        <Field
          label="Key"
          htmlFor={id('key')}
          hint="How it is stored. Letters, digits and underscores."
          required
          error={errors[`fieldDefs[${index}].key`]}
        >
          <input
            id={id('key')}
            className={`${inputClasses} font-mono`}
            value={fieldDef.key}
            onChange={(event) => onChange({ ...fieldDef, key: event.target.value })}
          />
        </Field>

        <Field label="Type" htmlFor={id('type')} error={errors[`fieldDefs[${index}].type`]}>
          <select
            id={id('type')}
            className={inputClasses}
            value={fieldDef.type}
            onChange={(event) => {
              const type = event.target.value as FieldDefType;
              // Options only mean anything on a choice field, and the API
              // refuses them anywhere else.
              onChange({
                ...fieldDef,
                type,
                options: CHOICE_TYPES.includes(type) ? fieldDef.options : [],
              });
            }}
          >
            {FIELD_DEF_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Group" htmlFor={id('group')} hint="Fields sharing a group render together.">
          <input
            id={id('group')}
            className={inputClasses}
            value={fieldDef.group}
            onChange={(event) => onChange({ ...fieldDef, group: event.target.value })}
          />
        </Field>
      </div>

      {CHOICE_TYPES.includes(fieldDef.type) ? (
        <Field
          label="Options"
          htmlFor={id('options')}
          hint="One per line."
          required
          error={errors[`fieldDefs[${index}].options`]}
        >
          <textarea
            id={id('options')}
            rows={3}
            className={inputClasses}
            value={fieldDef.options.join('\n')}
            onChange={(event) =>
              onChange({
                ...fieldDef,
                options: event.target.value
                  .split('\n')
                  .map((option) => option.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      ) : null}

      <Field label="Help text" htmlFor={id('help')}>
        <input
          id={id('help')}
          className={inputClasses}
          value={fieldDef.helpText}
          onChange={(event) => onChange({ ...fieldDef, helpText: event.target.value })}
        />
      </Field>

      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          checked={fieldDef.required}
          onChange={(event) => onChange({ ...fieldDef, required: event.target.checked })}
        />
        Required
      </label>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Only show this field when
        </p>

        {others.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">
            Add another field first — this one can depend on it.
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <select
              className={inputClasses}
              value={fieldDef.showIf?.field ?? ''}
              aria-label="Field this one depends on"
              onChange={(event) =>
                onChange({
                  ...fieldDef,
                  showIf: event.target.value ? { field: event.target.value, equals: '' } : null,
                })
              }
            >
              <option value="">Always show it</option>
              {others.map((sibling) => (
                <option key={sibling.key} value={sibling.key}>
                  {sibling.label || sibling.key}
                </option>
              ))}
            </select>

            {fieldDef.showIf ? (
              <select
                className={inputClasses}
                value={String(fieldDef.showIf.equals ?? '')}
                aria-label="Value it must equal"
                onChange={(event) =>
                  onChange({
                    ...fieldDef,
                    showIf: {
                      field: fieldDef.showIf!.field,
                      equals: parseEquals(showIfTarget, event.target.value),
                    },
                  })
                }
              >
                <option value="">equals…</option>
                {equalsOptions(showIfTarget).map((option) => (
                  <option key={option} value={option}>
                    equals {option}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

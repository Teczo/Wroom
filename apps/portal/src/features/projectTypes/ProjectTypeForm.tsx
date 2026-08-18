import type { FieldDef, ProjectType } from '@wroom/shared';
import { SERVICE_ROLES } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';
import { DynamicFields } from '../projects/DynamicFields';
import { FieldDefEditor, blankFieldDef } from './FieldDefEditor';
import { useCreateProjectType, useUpdateProjectType } from './api';

/**
 * Create or edit a project type.
 *
 * The preview beside the editor is not a mock-up — it is `DynamicFields`, the
 * same component the create-project form renders with. What shows here is
 * exactly what someone creating a project will get.
 */
export function ProjectTypeForm({
  projectType,
  onDone,
}: {
  projectType?: ProjectType;
  onDone: () => void;
}) {
  const create = useCreateProjectType();
  const update = useUpdateProjectType();
  const save = projectType ? update : create;

  const [key, setKey] = useState(projectType?.key ?? '');
  const [label, setLabel] = useState(projectType?.label ?? '');
  const [icon, setIcon] = useState(projectType?.icon ?? '');
  const [sortOrder, setSortOrder] = useState(String(projectType?.sortOrder ?? 0));
  const [active, setActive] = useState(projectType?.active ?? true);
  const [roles, setRoles] = useState<string[]>(projectType?.expectedServiceRoles ?? []);
  const [frontend, setFrontend] = useState((projectType?.defaultTechStack.frontend ?? []).join(', '));
  const [backend, setBackend] = useState((projectType?.defaultTechStack.backend ?? []).join(', '));
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>(projectType?.fieldDefs ?? []);

  /** Values typed into the preview, so `showIf` can be seen working. */
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});

  const errors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};

  const removedKeys = (projectType?.fieldDefs ?? [])
    .map((existing) => existing.key)
    .filter((existingKey) => !fieldDefs.some((fieldDef) => fieldDef.key === existingKey));

  function updateFieldAt(index: number, next: FieldDef): void {
    setFieldDefs((current) => current.map((entry, at) => (at === index ? next : entry)));
  }

  function moveFieldAt(index: number, direction: -1 | 1): void {
    setFieldDefs((current) => {
      const next = [...current];
      const target = index + direction;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  return (
    <form
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();

        const body = {
          label,
          icon,
          sortOrder: Number(sortOrder) || 0,
          active,
          expectedServiceRoles: roles,
          defaultTechStack: {
            frontend: frontend.split(',').map((entry) => entry.trim()).filter(Boolean),
            backend: backend.split(',').map((entry) => entry.trim()).filter(Boolean),
          },
          fieldDefs,
        };

        if (projectType) update.mutate({ id: projectType._id, ...body }, { onSuccess: onDone });
        else create.mutate({ ...body, key }, { onSuccess: onDone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label" htmlFor="type-label" required error={errors.label}>
          <input
            id="type-label"
            className={inputClasses}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
          />
        </Field>

        <Field
          label="Key"
          htmlFor="type-key"
          hint={
            projectType
              ? 'Fixed once the type exists — projects reference it by this.'
              : 'Lowercase and hyphens, e.g. browser-extension.'
          }
          required
          error={errors.key}
        >
          <input
            id="type-key"
            className={`${inputClasses} font-mono`}
            value={key}
            disabled={Boolean(projectType)}
            onChange={(event) => setKey(event.target.value)}
            required
          />
        </Field>

        <Field label="Icon" htmlFor="type-icon" hint="A name you recognise — “terminal”.">
          <input
            id="type-icon"
            className={inputClasses}
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
          />
        </Field>

        <Field label="Sort order" htmlFor="type-sort" hint="Lower numbers come first." error={errors.sortOrder}>
          <input
            id="type-sort"
            type="number"
            className={inputClasses}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </Field>

        <Field label="Default frontend stack" htmlFor="type-frontend" hint="Comma separated.">
          <input
            id="type-frontend"
            className={inputClasses}
            value={frontend}
            onChange={(event) => setFrontend(event.target.value)}
          />
        </Field>

        <Field label="Default backend stack" htmlFor="type-backend" hint="Comma separated.">
          <input
            id="type-backend"
            className={inputClasses}
            value={backend}
            onChange={(event) => setBackend(event.target.value)}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">Expected services</legend>
        <p className="mt-0.5 text-xs text-slate-500">
          What a project of this type usually runs. Shown as a hint, never created for you.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SERVICE_ROLES.map((role) => {
            const on = roles.includes(role);

            return (
              <button
                key={role}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setRoles((current) =>
                    on ? current.filter((entry) => entry !== role) : [...current, role],
                  )
                }
                className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                  on ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'
                }`}
              >
                {humanise(role)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex min-h-11 items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-slate-300"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        <span>
          Available when creating a project.
          <span className="mt-0.5 block text-xs text-slate-500">
            Turning this off only hides it from the create form. Projects already of this type are
            untouched and keep working.
          </span>
        </span>
      </label>

      {/* Editor and preview side by side on a wide screen, stacked on a phone. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Fields</h3>
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 text-xs"
              onClick={() => setFieldDefs((current) => [...current, blankFieldDef()])}
            >
              Add field
            </Button>
          </div>

          {fieldDefs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
              No type-specific fields yet. A project of this type will just have the shared ones.
            </p>
          ) : (
            fieldDefs.map((fieldDef, index) => (
              <FieldDefEditor
                key={index}
                fieldDef={fieldDef}
                index={index}
                total={fieldDefs.length}
                siblings={fieldDefs}
                errors={errors}
                onChange={(next) => updateFieldAt(index, next)}
                onRemove={() =>
                  setFieldDefs((current) => current.filter((_, at) => at !== index))
                }
                onMove={(direction) => moveFieldAt(index, direction)}
              />
            ))
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
          <p className="text-xs text-slate-500">
            Exactly what the create-project form will show. Type into it to see conditional fields
            appear.
          </p>

          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            {fieldDefs.filter((fieldDef) => fieldDef.key && fieldDef.label).length === 0 ? (
              <p className="text-xs text-slate-400">
                Give a field a key and a label and it will appear here.
              </p>
            ) : (
              <DynamicFields
                fieldDefs={fieldDefs.filter((fieldDef) => fieldDef.key && fieldDef.label)}
                values={previewValues}
                errors={{}}
                onChange={(fieldKey, value) =>
                  setPreviewValues((current) => ({ ...current, [fieldKey]: value }))
                }
              />
            )}
          </div>
        </div>
      </div>

      {removedKeys.length > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Removing {removedKeys.map((removed) => `“${removed}”`).join(', ')} hides{' '}
          {removedKeys.length === 1 ? 'that value' : 'those values'} on existing projects. Nothing is
          deleted — the data stays in the record and comes back if you add the field again.
        </p>
      ) : null}

      {save.isError ? (
        <p className="text-sm text-red-600">
          {save.error instanceof ApiRequestError ? save.error.message : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || label.trim() === '' || key.trim() === ''}>
          {save.isPending ? 'Saving…' : projectType ? 'Save type' : 'Create type'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

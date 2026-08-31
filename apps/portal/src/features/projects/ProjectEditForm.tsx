import type { FieldDef, Project, ProjectType } from '@wroom/shared';
import { PROJECT_STATUSES } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';
import { useProducts } from '../products/api';
import { DynamicFields } from './DynamicFields';
import { useProjectTypes, useUpdateProject } from './api';

/**
 * The edit half of the project record. Type-specific fields come from the
 * selected type's `fieldDefs`, exactly as the create form does — switching type
 * re-renders them, and anything the new type has no field for is called out
 * before it is saved, never dropped silently.
 *
 * Archiving is deliberately absent here: it is an action, not a status you pick
 * off a list like any other.
 */

/** Statuses you can pick. Archiving happens through its own action. */
const EDITABLE_STATUSES = PROJECT_STATUSES.filter((status) => status !== 'archived');

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  return !(Array.isArray(value) && value.length === 0);
}

function labelFor(fieldDefs: FieldDef[], key: string): string {
  return fieldDefs.find((fieldDef) => fieldDef.key === key)?.label ?? key;
}

function commaList(values: string[]): string {
  return values.join(', ');
}

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function dateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

export function ProjectEditForm({ project }: { project: Project }) {
  const projectTypes = useProjectTypes();
  const products = useProducts();
  const update = useUpdateProject(project._id);

  const [productId, setProductId] = useState(project.productId);
  const [projectTypeKey, setProjectTypeKey] = useState(project.projectTypeKey);
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [shortDescription, setShortDescription] = useState(project.shortDescription);
  const [status, setStatus] = useState<string>(project.status);
  const [phase, setPhase] = useState(project.phase);
  const [startedAt, setStartedAt] = useState(dateInput(project.startedAt));
  const [launchedAt, setLaunchedAt] = useState(dateInput(project.launchedAt));
  const [repoFullName, setRepoFullName] = useState(project.repo.fullName);
  const [defaultBranch, setDefaultBranch] = useState(project.repo.defaultBranch);
  const [tags, setTags] = useState(commaList(project.tags));
  const [frontend, setFrontend] = useState(commaList(project.techStack.frontend));
  const [backend, setBackend] = useState(commaList(project.techStack.backend));
  const [database, setDatabase] = useState(commaList(project.techStack.database));
  const [other, setOther] = useState(commaList(project.techStack.other));
  const [details, setDetails] = useState<Record<string, unknown>>(project.details ?? {});
  const [saved, setSaved] = useState(false);

  if (projectTypes.isPending || products.isPending) {
    return <LoadingState label="Loading the form…" />;
  }

  if (projectTypes.isError || products.isError) {
    return (
      <ErrorState
        error={projectTypes.error ?? products.error}
        onRetry={() => {
          void projectTypes.refetch();
          void products.refetch();
        }}
      />
    );
  }

  const currentType: ProjectType | undefined = projectTypes.data.items.find(
    (type) => type.key === project.projectTypeKey,
  );
  const selectedType: ProjectType | undefined = projectTypes.data.items.find(
    (type) => type.key === projectTypeKey,
  );

  // What switching type would throw away: values that are set now but have no
  // field on the type about to be selected.
  const typeChanged = projectTypeKey !== project.projectTypeKey;
  const discarded = !typeChanged
    ? []
    : Object.keys(details).filter(
        (key) =>
          hasValue(details[key]) &&
          !(selectedType?.fieldDefs ?? []).some((fieldDef) => fieldDef.key === key),
      );

  const fieldErrors = update.error instanceof ApiRequestError ? update.error.fieldErrors : {};

  return (
    <form
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(false);

        update.mutate(
          {
            productId,
            projectTypeKey,
            name,
            slug,
            shortDescription,
            status,
            phase,
            startedAt: startedAt || null,
            launchedAt: launchedAt || null,
            repo: {
              provider: 'github',
              fullName: repoFullName,
              defaultBranch,
              webhookConfigured: project.repo.webhookConfigured,
            },
            techStack: {
              frontend: parseCommaList(frontend),
              backend: parseCommaList(backend),
              database: parseCommaList(database),
              other: parseCommaList(other),
            },
            tags: parseCommaList(tags),
            details,
          },
          { onSuccess: () => setSaved(true) },
        );
      }}
    >
      <Field label="Product" htmlFor="edit-product" required error={fieldErrors.productId}>
        <select
          id="edit-product"
          className={inputClasses}
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
        >
          {products.data.items.map((product) => (
            <option key={product._id} value={product._id}>
              {product.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Project type"
        htmlFor="edit-type"
        hint="Changing this re-renders the fields below from the new type."
        error={fieldErrors.projectTypeKey}
      >
        <select
          id="edit-type"
          className={inputClasses}
          value={projectTypeKey}
          onChange={(event) => setProjectTypeKey(event.target.value)}
        >
          {projectTypes.data.items.map((type) => (
            <option key={type.key} value={type.key}>
              {type.label}
            </option>
          ))}
        </select>
      </Field>

      {discarded.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Saving as {selectedType?.label ?? projectTypeKey} will discard{' '}
            {discarded.length === 1 ? 'this value' : 'these values'}
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
            {discarded.map((key) => (
              <li key={key}>
                {labelFor(currentType?.fieldDefs ?? [], key)} —{' '}
                {String(
                  Array.isArray(details[key]) ? (details[key] as string[]).join(', ') : details[key],
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-700">
            The new type has no field to keep {discarded.length === 1 ? 'it' : 'them'} in. Switch
            back before saving if that is wrong.
          </p>
        </div>
      ) : null}

      <Field label="Name" htmlFor="edit-name" required error={fieldErrors.name}>
        <input
          id="edit-name"
          className={inputClasses}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Slug"
        htmlFor="edit-slug"
        hint="Lowercase and dashes. It has to be unique across projects."
        error={fieldErrors.slug}
      >
        <input
          id="edit-slug"
          className={inputClasses}
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Short description"
        htmlFor="edit-description"
        error={fieldErrors.shortDescription}
      >
        <textarea
          id="edit-description"
          rows={2}
          className={inputClasses}
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="edit-status" error={fieldErrors.status}>
          <select
            id="edit-status"
            className={inputClasses}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {EDITABLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Phase" htmlFor="edit-phase" error={fieldErrors.phase}>
          <input
            id="edit-phase"
            className={inputClasses}
            value={phase}
            onChange={(event) => setPhase(event.target.value)}
          />
        </Field>

        <Field label="Started" htmlFor="edit-started" error={fieldErrors.startedAt}>
          <input
            id="edit-started"
            type="date"
            className={inputClasses}
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
          />
        </Field>

        <Field label="Launched" htmlFor="edit-launched" error={fieldErrors.launchedAt}>
          <input
            id="edit-launched"
            type="date"
            className={inputClasses}
            value={launchedAt}
            onChange={(event) => setLaunchedAt(event.target.value)}
          />
        </Field>

        <Field label="Repo" htmlFor="edit-repo" hint="owner/name on GitHub">
          <input
            id="edit-repo"
            className={inputClasses}
            value={repoFullName}
            onChange={(event) => setRepoFullName(event.target.value)}
          />
        </Field>

        <Field label="Default branch" htmlFor="edit-branch">
          <input
            id="edit-branch"
            className={inputClasses}
            value={defaultBranch}
            onChange={(event) => setDefaultBranch(event.target.value)}
          />
        </Field>
      </div>

      <Field label="Tags" htmlFor="edit-tags" hint="Comma separated.">
        <input
          id="edit-tags"
          className={inputClasses}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
      </Field>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900">Tech stack</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frontend" htmlFor="edit-frontend" hint="Comma separated.">
            <input
              id="edit-frontend"
              className={inputClasses}
              value={frontend}
              onChange={(event) => setFrontend(event.target.value)}
            />
          </Field>
          <Field label="Backend" htmlFor="edit-backend" hint="Comma separated.">
            <input
              id="edit-backend"
              className={inputClasses}
              value={backend}
              onChange={(event) => setBackend(event.target.value)}
            />
          </Field>
          <Field label="Database" htmlFor="edit-database" hint="Comma separated.">
            <input
              id="edit-database"
              className={inputClasses}
              value={database}
              onChange={(event) => setDatabase(event.target.value)}
            />
          </Field>
          <Field label="Other" htmlFor="edit-other" hint="Comma separated.">
            <input
              id="edit-other"
              className={inputClasses}
              value={other}
              onChange={(event) => setOther(event.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      {selectedType ? (
        <DynamicFields
          fieldDefs={selectedType.fieldDefs}
          values={details}
          errors={fieldErrors}
          onChange={(key, value) => setDetails((current) => ({ ...current, [key]: value }))}
        />
      ) : null}

      {update.isError ? (
        <p className="text-sm text-red-600">
          {update.error instanceof ApiRequestError
            ? update.error.message
            : 'That could not be saved.'}
        </p>
      ) : null}

      {saved && !update.isError ? <p className="text-sm text-green-700">Saved.</p> : null}

      <Button type="submit" disabled={update.isPending || name.trim() === ''}>
        {update.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}

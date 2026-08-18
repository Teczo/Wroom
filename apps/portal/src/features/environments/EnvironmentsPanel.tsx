import type { Environment } from '@wroom/shared';
import { ENVIRONMENT_NAMES } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import {
  useCreateEnvironment,
  useDeleteEnvironment,
  useEnvironments,
  useUpdateEnvironment,
} from './api';

/**
 * Where a project actually runs. The primary environment is the one shown on
 * the project card, so exactly one is marked here at any time — the API keeps
 * that true, and the first environment added becomes it automatically.
 *
 * `healthCheckUrl` is recorded and nothing here ever calls it; checking it is
 * WRM-070.
 */

function ExternalLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(event) => event.stopPropagation()}
      className="truncate text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900"
    >
      {href.replace(/^https?:\/\//, '')}
    </a>
  );
}

function EnvironmentForm({
  projectId,
  environment,
  onDone,
}: {
  projectId: string;
  environment?: Environment;
  onDone: () => void;
}) {
  const create = useCreateEnvironment(projectId);
  const update = useUpdateEnvironment(projectId);
  const save = environment ? update : create;

  const [name, setName] = useState<string>(environment?.name ?? 'production');
  const [branch, setBranch] = useState(environment?.branch ?? 'main');
  const [publicUrl, setPublicUrl] = useState(environment?.publicUrl ?? '');
  const [healthCheckUrl, setHealthCheckUrl] = useState(environment?.healthCheckUrl ?? '');

  const fieldErrors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const body = {
          name,
          branch,
          publicUrl: publicUrl.trim() || null,
          healthCheckUrl: healthCheckUrl.trim() || null,
        };

        if (environment) update.mutate({ id: environment._id, ...body }, { onSuccess: onDone });
        else create.mutate(body, { onSuccess: onDone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Environment" htmlFor="env-name" required error={fieldErrors.name}>
          <select
            id="env-name"
            className={inputClasses}
            value={name}
            onChange={(event) => setName(event.target.value)}
          >
            {ENVIRONMENT_NAMES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Branch" htmlFor="env-branch" error={fieldErrors.branch}>
          <input
            id="env-branch"
            className={inputClasses}
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Public URL"
        htmlFor="env-url"
        hint="Where this environment is reachable. Leave blank if it isn't."
        error={fieldErrors.publicUrl}
      >
        <input
          id="env-url"
          type="url"
          className={inputClasses}
          placeholder="https://"
          value={publicUrl}
          onChange={(event) => setPublicUrl(event.target.value)}
        />
      </Field>

      <Field
        label="Health check URL"
        htmlFor="env-health"
        hint="Recorded for later. Nothing calls it yet."
        error={fieldErrors.healthCheckUrl}
      >
        <input
          id="env-health"
          type="url"
          className={inputClasses}
          placeholder="https://"
          value={healthCheckUrl}
          onChange={(event) => setHealthCheckUrl(event.target.value)}
        />
      </Field>

      {save.isError ? (
        <p className="text-sm text-red-600">
          {save.error instanceof ApiRequestError ? save.error.message : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : environment ? 'Save environment' : 'Add environment'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EnvironmentRow({
  projectId,
  environment,
  isOnlyPrimary,
}: {
  projectId: string;
  environment: Environment;
  isOnlyPrimary: boolean;
}) {
  const update = useUpdateEnvironment(projectId);
  const remove = useDeleteEnvironment(projectId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <div className="p-4">
        <EnvironmentForm
          projectId={projectId}
          environment={environment}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  const blockedBy =
    remove.error instanceof ApiRequestError && remove.error.status === 409
      ? Number(remove.error.details?.serviceCount ?? 0)
      : 0;

  return (
    <div className="border-b border-slate-100 p-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900">{environment.name}</p>
            {environment.isPrimary ? <Pill label="Primary" tone="green" /> : null}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">branch {environment.branch || '—'}</p>
          <div className="mt-1">
            {environment.publicUrl ? (
              <ExternalLink href={environment.publicUrl} />
            ) : (
              <span className="text-xs text-slate-400">No public URL</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {environment.isPrimary ? null : (
            <Button
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: environment._id, isPrimary: true })}
            >
              Make primary
            </Button>
          )}
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
            onClick={() => setConfirming((current) => !current)}
          >
            Delete
          </Button>
        </div>
      </div>

      {confirming ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-900">
            Delete the {environment.name} environment?
          </p>
          <p className="mt-1 text-xs text-red-700">
            {environment.isPrimary
              ? isOnlyPrimary
                ? 'This is the primary environment and the only one, so the project will be left with no primary and no URL on its card.'
                : 'This is the primary environment. The project will be left with no primary until you set another one — its card will show no URL in the meantime.'
              : 'This environment is not the primary one, so the project card is unaffected.'}
          </p>

          <div className="mt-3 flex gap-2">
            <Button
              variant="danger"
              className="min-h-9 text-xs"
              disabled={remove.isPending}
              onClick={() => remove.mutate(environment._id, { onSuccess: () => setConfirming(false) })}
            >
              {remove.isPending ? 'Deleting…' : 'Yes, delete it'}
            </Button>
            <Button
              variant="ghost"
              className="min-h-9 text-xs"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
          </div>

          {blockedBy > 0 ? (
            <p className="mt-2 text-sm text-red-900">
              {blockedBy} {blockedBy === 1 ? 'service is' : 'services are'} still in this
              environment, so it cannot be deleted yet.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function EnvironmentsPanel({ projectId }: { projectId: string }) {
  const environments = useEnvironments(projectId);
  const [adding, setAdding] = useState(false);

  const items = environments.data?.items ?? [];
  const primaryCount = items.filter((environment) => environment.isPrimary).length;
  const canAddMore = items.length < ENVIRONMENT_NAMES.length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Environments</h3>
        {canAddMore && !adding ? (
          <Button variant="secondary" className="min-h-9 text-xs" onClick={() => setAdding(true)}>
            Add environment
          </Button>
        ) : null}
      </div>

      {environments.isPending ? (
        <div className="p-4">
          <LoadingState label="Loading environments…" />
        </div>
      ) : null}

      {environments.isError ? (
        <div className="p-4">
          <ErrorState
            error={environments.error}
            onRetry={() => void environments.refetch()}
          />
        </div>
      ) : null}

      {adding ? (
        <div className="p-4">
          <EnvironmentForm projectId={projectId} onDone={() => setAdding(false)} />
        </div>
      ) : null}

      {environments.isSuccess && items.length === 0 && !adding ? (
        <div className="p-4">
          <EmptyState
            title="Nowhere recorded yet"
            whatToDoNext="Add the production environment first — its URL is what shows on the project card and what you tap to check the live site. Dev and staging can follow."
            action={<Button onClick={() => setAdding(true)}>Add production</Button>}
          />
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          {primaryCount === 0 ? (
            <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              No primary environment set, so this project's card shows no URL. Pick one with “Make
              primary”.
            </p>
          ) : null}

          {items.map((environment) => (
            <EnvironmentRow
              key={environment._id}
              projectId={projectId}
              environment={environment}
              isOnlyPrimary={items.length === 1}
            />
          ))}
        </>
      ) : null}
    </section>
  );
}

import type { Project } from '@wroom/shared';
import { PROJECT_STATUSES } from '@wroom/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';
import { useDeleteProject, useUpdateProject } from './api';

/**
 * Archive, un-archive and delete — the three things that end a project's life
 * in the working list. Each is its own deliberate action rather than a value in
 * a dropdown, because none of them is an ordinary edit.
 */

/** Where an un-archived project lands. There is no "previous status" recorded. */
const RESTORE_STATUSES = PROJECT_STATUSES.filter((status) => status !== 'archived');
const RESTORE_DEFAULT = 'on-hold';

/** "features" → "features", "timeEntries" → "time entries" */
function humaniseBlocker(key: string): string {
  return key.replace(/([A-Z])/g, (letter) => ` ${letter.toLowerCase()}`);
}

function blockingSentence(details: Record<string, unknown> | undefined): string | null {
  const counts = Object.entries(details ?? {}).filter(
    ([, value]) => typeof value === 'number' && value > 0,
  ) as Array<[string, number]>;

  if (counts.length === 0) return null;

  const parts = counts.map(
    ([key, count]) => `${count} ${humaniseBlocker(key).replace(/s$/, count === 1 ? '' : 's')}`,
  );

  const last = parts.pop();
  return parts.length === 0 ? last! : `${parts.join(', ')} and ${last}`;
}

function ArchiveAction({ project }: { project: Project }) {
  const update = useUpdateProject(project._id);
  const [restoreTo, setRestoreTo] = useState<string>(RESTORE_DEFAULT);
  const isArchived = project.status === 'archived';

  if (isArchived) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Un-archive</h3>
        <p className="mt-1 text-sm text-slate-500">
          Wroom does not record what the status was before archiving, so pick where this should
          land.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Bring it back as" htmlFor="restore-status">
            <select
              id="restore-status"
              className={`${inputClasses} sm:w-56`}
              value={restoreTo}
              onChange={(event) => setRestoreTo(event.target.value)}
            >
              {RESTORE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {humanise(value)}
                </option>
              ))}
            </select>
          </Field>

          <Button
            variant="secondary"
            disabled={update.isPending}
            onClick={() => update.mutate({ status: restoreTo })}
          >
            {update.isPending ? 'Un-archiving…' : 'Un-archive project'}
          </Button>
        </div>

        {update.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {update.error instanceof ApiRequestError
              ? update.error.message
              : 'That could not be changed.'}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Archive</h3>
      <p className="mt-1 text-sm text-slate-500">
        Drops this project out of the working list. Nothing is deleted, and you can bring it back.
      </p>

      <Button
        variant="secondary"
        className="mt-4"
        disabled={update.isPending}
        onClick={() => update.mutate({ status: 'archived' })}
      >
        {update.isPending ? 'Archiving…' : 'Archive project'}
      </Button>

      {update.isError ? (
        <p className="mt-3 text-sm text-red-600">
          {update.error instanceof ApiRequestError
            ? update.error.message
            : 'That could not be changed.'}
        </p>
      ) : null}
    </div>
  );
}

function DeleteAction({ project }: { project: Project }) {
  const navigate = useNavigate();
  const remove = useDeleteProject(project._id);
  const [typedName, setTypedName] = useState('');

  const blocked =
    remove.error instanceof ApiRequestError && remove.error.status === 409
      ? blockingSentence(remove.error.details)
      : null;

  return (
    <div className="rounded-xl border border-red-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-red-900">Delete permanently</h3>
      <p className="mt-1 text-sm text-slate-500">
        This cannot be undone. Deleting is refused while anything is still attached — archive it
        instead if it has history worth keeping.
      </p>

      <div className="mt-4">
        <Field label={`Type "${project.name}" to confirm`} htmlFor="delete-confirm">
          <input
            id="delete-confirm"
            className={inputClasses}
            value={typedName}
            autoComplete="off"
            onChange={(event) => setTypedName(event.target.value)}
          />
        </Field>
      </div>

      <Button
        variant="danger"
        className="mt-4"
        disabled={typedName !== project.name || remove.isPending}
        onClick={() =>
          remove.mutate(undefined, {
            onSuccess: () => navigate('/projects'),
          })
        }
      >
        {remove.isPending ? 'Deleting…' : 'Delete this project'}
      </Button>

      {blocked ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-900">
            This project still has {blocked} attached to it, so it cannot be deleted.
          </p>
          <p className="mt-1 text-sm text-red-700">
            Remove those first, or archive the project instead.
          </p>
        </div>
      ) : null}

      {remove.isError && !blocked ? (
        <p className="mt-3 text-sm text-red-600">
          {remove.error instanceof ApiRequestError
            ? remove.error.message
            : 'That could not be deleted.'}
        </p>
      ) : null}
    </div>
  );
}

export function ProjectLifecycle({ project }: { project: Project }) {
  return (
    <div className="space-y-4">
      <ArchiveAction project={project} />
      <DeleteAction project={project} />
    </div>
  );
}

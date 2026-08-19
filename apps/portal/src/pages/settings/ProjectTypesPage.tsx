import type { ProjectType } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useProjects } from '../../features/projects/api';
import { ProjectTypeForm } from '../../features/projectTypes/ProjectTypeForm';
import { useAllProjectTypes, useDeleteProjectType } from '../../features/projectTypes/api';
import { ApiRequestError } from '../../lib/api';

/**
 * Project types admin. Adding a kind of project is a data change here rather
 * than a seed script and a deploy.
 */

function TypeRow({
  projectType,
  projectCount,
  onEdit,
}: {
  projectType: ProjectType;
  projectCount: number;
  onEdit: () => void;
}) {
  const remove = useDeleteProjectType();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');

  const blocked =
    remove.error instanceof ApiRequestError && remove.error.status === 409
      ? remove.error.message
      : null;

  return (
    <div className={`border-b border-slate-100 p-4 last:border-0 ${projectType.active ? '' : 'bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium text-slate-900">{projectType.label}</p>
            {projectType.active ? null : <Pill label="Hidden from create" tone="amber" />}
          </div>

          <p className="mt-0.5 font-mono text-xs text-slate-500">{projectType.key}</p>

          <p className="mt-1 text-xs text-slate-500">
            {projectType.fieldDefs.length} field{projectType.fieldDefs.length === 1 ? '' : 's'} ·{' '}
            {projectCount} project{projectCount === 1 ? '' : 's'} · order {projectType.sortOrder}
          </p>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" className="min-h-9 px-2 text-xs" onClick={onEdit}>
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
          <Field label={`Type "${projectType.key}" to confirm`} htmlFor={`del-${projectType._id}`}>
            <input
              id={`del-${projectType._id}`}
              className={inputClasses}
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          </Field>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="danger"
              className="min-h-9 text-xs"
              disabled={typed !== projectType.key || remove.isPending}
              onClick={() => remove.mutate(projectType._id)}
            >
              {remove.isPending ? 'Deleting…' : 'Delete this type'}
            </Button>
            <Button
              variant="ghost"
              className="min-h-9 text-xs"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
          </div>

          {blocked ? <p className="mt-2 text-sm text-red-900">{blocked}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectTypesPage() {
  const projectTypes = useAllProjectTypes(true);
  // Every project, archived included, so the counts are honest.
  const projects = useProjects({ includeArchived: true });
  const [editing, setEditing] = useState<ProjectType | null>(null);
  const [creating, setCreating] = useState(false);

  const countFor = (key: string) =>
    (projects.data?.items ?? []).filter((project) => project.projectTypeKey === key).length;

  const items = [...(projectTypes.data?.items ?? [])].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
  );

  if (editing || creating) {
    return (
      <>
        <PageHeader
          title={editing ? `Edit ${editing.label}` : 'New project type'}
          subtitle="The fields here become the form people fill in when they create a project."
        />
        <ProjectTypeForm
          projectType={editing ?? undefined}
          onDone={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Project types"
        subtitle="What kinds of project exist, and what each one asks for."
        actions={<Button onClick={() => setCreating(true)}>New type</Button>}
      />

      {projectTypes.isPending ? <LoadingState label="Loading project types…" /> : null}

      {projectTypes.isError ? (
        <ErrorState error={projectTypes.error} onRetry={() => void projectTypes.refetch()} />
      ) : null}

      {projectTypes.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No project types yet"
          whatToDoNext="A project type decides what the create-project form asks for. Add one — or run the seed to get the starting set."
          action={<Button onClick={() => setCreating(true)}>Create the first type</Button>}
        />
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((projectType) => (
            <TypeRow
              key={projectType._id}
              projectType={projectType}
              projectCount={countFor(projectType.key)}
              onEdit={() => setEditing(projectType)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

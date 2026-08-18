import type { ProjectLinkType, ProjectLinkWithProject } from '@wroom/shared';
import { PROJECT_LINK_TYPES } from '@wroom/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ProjectStatusPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { useProjects } from '../projects/api';
import { useCreateLink, useDeleteLink, useProjectLinks, useUpdateLink } from './api';

/**
 * What this project points at, and what points back at it. Two lists, not a
 * graph — the question being answered is "what breaks if I kill this", and a
 * list answers it faster than a diagram on a phone.
 */

/** Read from the subject project's side, in each direction. */
const OUTGOING_PHRASING: Record<ProjectLinkType, string> = {
  'component-of': 'is a component of',
  'depends-on': 'depends on',
  'shares-backend': 'shares a backend with',
  related: 'is related to',
};

const INCOMING_PHRASING: Record<ProjectLinkType, string> = {
  'component-of': 'is a component of this',
  'depends-on': 'depends on this',
  'shares-backend': 'shares a backend with this',
  related: 'is related to this',
};

function LinkForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const create = useCreateLink(projectId);
  const projects = useProjects({ includeArchived: true });

  const [toProjectId, setToProjectId] = useState('');
  const [type, setType] = useState<string>('depends-on');
  const [note, setNote] = useState('');

  const others = (projects.data?.items ?? []).filter((project) => project._id !== projectId);
  const fieldErrors = create.error instanceof ApiRequestError ? create.error.fieldErrors : {};

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({ toProjectId, type, note }, { onSuccess: onDone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="This project…" htmlFor="link-type" required error={fieldErrors.type}>
          <select
            id="link-type"
            className={inputClasses}
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {PROJECT_LINK_TYPES.map((value) => (
              <option key={value} value={value}>
                {OUTGOING_PHRASING[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="…this one" htmlFor="link-target" required error={fieldErrors.toProjectId}>
          <select
            id="link-target"
            className={inputClasses}
            value={toProjectId}
            onChange={(event) => setToProjectId(event.target.value)}
            required
          >
            <option value="">Choose a project…</option>
            {others.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Note"
        htmlFor="link-note"
        hint="What the relationship actually is — “the app calls its expedition API”."
        error={fieldErrors.note}
      >
        <input
          id="link-note"
          className={inputClasses}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>

      {create.isError ? (
        <p className="text-sm text-red-600">
          {create.error instanceof ApiRequestError
            ? create.error.message
            : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending || toProjectId === ''}>
          {create.isPending ? 'Linking…' : 'Add link'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function LinkRow({
  link,
  phrasing,
  editable,
}: {
  link: ProjectLinkWithProject;
  phrasing: Record<ProjectLinkType, string>;
  editable: boolean;
}) {
  const update = useUpdateLink();
  const remove = useDeleteLink();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<string>(link.type);
  const [note, setNote] = useState(link.note);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="border-b border-slate-100 p-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{phrasing[link.type]}</p>
          <Link
            to={`/projects/${link.project._id}`}
            className="mt-0.5 block truncate text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            {link.project.name}
          </Link>
          {link.note ? <p className="mt-1 text-xs text-slate-600">{link.note}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <ProjectStatusPill status={link.project.status} />
          {editable ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                className="min-h-9 px-2 text-xs"
                onClick={() => setEditing((current) => !current)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
                onClick={() => setConfirming((current) => !current)}
              >
                Remove
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Field label="Relationship" htmlFor={`type-${link._id}`}>
            <select
              id={`type-${link._id}`}
              className={inputClasses}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {PROJECT_LINK_TYPES.map((value) => (
                <option key={value} value={value}>
                  {OUTGOING_PHRASING[value]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Note" htmlFor={`note-${link._id}`}>
            <input
              id={`note-${link._id}`}
              className={inputClasses}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>

          {update.isError ? (
            <p className="text-sm text-red-600">
              {update.error instanceof ApiRequestError
                ? update.error.message
                : 'That could not be saved.'}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              className="min-h-9 text-xs"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({ id: link._id, type, note }, { onSuccess: () => setEditing(false) })
              }
            >
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              className="min-h-9 text-xs"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-900">Remove this link?</p>
          <Button
            variant="danger"
            className="min-h-9 text-xs"
            disabled={remove.isPending}
            onClick={() => remove.mutate(link._id, { onSuccess: () => setConfirming(false) })}
          >
            {remove.isPending ? 'Removing…' : 'Yes, remove it'}
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 text-xs"
            onClick={() => setConfirming(false)}
          >
            Keep it
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectLinksPanel({ projectId }: { projectId: string }) {
  const links = useProjectLinks(projectId);
  const [adding, setAdding] = useState(false);

  const outgoing = links.data?.outgoing ?? [];
  const incoming = links.data?.incoming ?? [];
  const dependedOnBy = links.data?.dependedOnByCount ?? 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Links</h3>
        {adding ? null : (
          <Button variant="secondary" className="min-h-9 text-xs" onClick={() => setAdding(true)}>
            Add link
          </Button>
        )}
      </div>

      {dependedOnBy > 0 ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {dependedOnBy} {dependedOnBy === 1 ? 'project depends' : 'projects depend'} on this one.
          Deleting or migrating it breaks {dependedOnBy === 1 ? 'that' : 'those'}.
        </p>
      ) : null}

      {links.isPending ? (
        <div className="p-4">
          <LoadingState label="Loading links…" />
        </div>
      ) : null}

      {links.isError ? (
        <div className="p-4">
          <ErrorState error={links.error} onRetry={() => void links.refetch()} />
        </div>
      ) : null}

      {adding ? (
        <div className="p-4">
          <LinkForm projectId={projectId} onDone={() => setAdding(false)} />
        </div>
      ) : null}

      {links.isSuccess && outgoing.length === 0 && incoming.length === 0 && !adding ? (
        <div className="p-4">
          <EmptyState
            title="Nothing linked yet"
            whatToDoNext="A link records how two projects relate — a mobile app to the API it calls, a component to the product it belongs to. Add them and this page will tell you what breaks before you delete or migrate anything."
            action={<Button onClick={() => setAdding(true)}>Add the first link</Button>}
          />
        </div>
      ) : null}

      {outgoing.length > 0 ? (
        <div>
          <p className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            This project points at
          </p>
          {outgoing.map((link) => (
            <LinkRow key={link._id} link={link} phrasing={OUTGOING_PHRASING} editable />
          ))}
        </div>
      ) : null}

      {incoming.length > 0 ? (
        <div>
          <p className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Points at this project
          </p>
          {incoming.map((link) => (
            <LinkRow key={link._id} link={link} phrasing={INCOMING_PHRASING} editable={false} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

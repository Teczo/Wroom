import type { Decision, DecisionStatus } from '@wroom/shared';
import { DECISION_STATUSES } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { humanise, shortDate } from '../../lib/format';
import {
  useCreateDecision,
  useDecisions,
  useDeleteDecision,
  useSupersedeDecision,
  useUpdateDecision,
} from './api';

/**
 * The reasoning behind a project. Everything is plain text — no markdown
 * rendering and no editor dependency, per the ticket.
 *
 * Superseded decisions are kept but hidden by default: the point of the log is
 * what holds today, with the trail available when you ask for it.
 */

const STATUS_TONES: Record<DecisionStatus, 'neutral' | 'green' | 'amber'> = {
  proposed: 'neutral',
  accepted: 'green',
  superseded: 'amber',
};

function dateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function DecisionForm({
  projectId,
  decision,
  onDone,
}: {
  projectId: string;
  decision?: Decision;
  onDone: () => void;
}) {
  const create = useCreateDecision(projectId);
  const update = useUpdateDecision();
  const save = decision ? update : create;

  const [title, setTitle] = useState(decision?.title ?? '');
  const [context, setContext] = useState(decision?.context ?? '');
  const [choice, setChoice] = useState(decision?.decision ?? '');
  const [alternativesRejected, setAlternatives] = useState(decision?.alternativesRejected ?? '');
  const [status, setStatus] = useState<string>(decision?.status ?? 'accepted');
  const [decidedAt, setDecidedAt] = useState(dateInput(decision?.decidedAt ?? null));

  const fieldErrors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};

  // Only the supersede action sets this, so the form never offers "superseded".
  const selectableStatuses = DECISION_STATUSES.filter((value) => value !== 'superseded');

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const body = {
          title,
          context,
          decision: choice,
          alternativesRejected,
          status,
          decidedAt: decidedAt || null,
        };

        if (decision) update.mutate({ id: decision._id, ...body }, { onSuccess: onDone });
        else create.mutate(body, { onSuccess: onDone });
      }}
    >
      <Field
        label="What was decided"
        htmlFor="decision-title"
        hint="Short and declarative — “MongoDB Atlas over Postgres”."
        required
        error={fieldErrors.title}
      >
        <input
          id="decision-title"
          className={inputClasses}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Context"
        htmlFor="decision-context"
        hint="What was going on that forced the choice."
        error={fieldErrors.context}
      >
        <textarea
          id="decision-context"
          rows={4}
          className={inputClasses}
          value={context}
          onChange={(event) => setContext(event.target.value)}
        />
      </Field>

      <Field label="The choice" htmlFor="decision-body" error={fieldErrors.decision}>
        <textarea
          id="decision-body"
          rows={4}
          className={inputClasses}
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
        />
      </Field>

      <Field
        label="Alternatives rejected"
        htmlFor="decision-alternatives"
        hint="What else was on the table, and why it lost."
        error={fieldErrors.alternativesRejected}
      >
        <textarea
          id="decision-alternatives"
          rows={4}
          className={inputClasses}
          value={alternativesRejected}
          onChange={(event) => setAlternatives(event.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="decision-status" error={fieldErrors.status}>
          <select
            id="decision-status"
            className={inputClasses}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {selectableStatuses.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Decided on" htmlFor="decision-date" error={fieldErrors.decidedAt}>
          <input
            id="decision-date"
            type="date"
            className={inputClasses}
            value={decidedAt}
            onChange={(event) => setDecidedAt(event.target.value)}
          />
        </Field>
      </div>

      {save.isError ? (
        <p className="text-sm text-red-600">
          {save.error instanceof ApiRequestError ? save.error.message : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || title.trim() === ''}>
          {save.isPending ? 'Saving…' : decision ? 'Save decision' : 'Record decision'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SupersedeForm({
  decision,
  candidates,
  onDone,
}: {
  decision: Decision;
  candidates: Decision[];
  onDone: () => void;
}) {
  const supersede = useSupersedeDecision();
  const [replacementId, setReplacementId] = useState('');

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm text-amber-900">Which decision replaced this one?</p>

      {candidates.length === 0 ? (
        <p className="text-xs text-amber-800">
          There is no other decision on this project yet. Record the replacement first, then come
          back and link it.
        </p>
      ) : (
        <>
          <select
            className={inputClasses}
            value={replacementId}
            onChange={(event) => setReplacementId(event.target.value)}
            aria-label="Replacement decision"
          >
            <option value="">Choose a decision…</option>
            {candidates.map((candidate) => (
              <option key={candidate._id} value={candidate._id}>
                {candidate.title}
              </option>
            ))}
          </select>

          {supersede.isError ? (
            <p className="text-sm text-red-600">
              {supersede.error instanceof ApiRequestError
                ? supersede.error.message
                : 'That could not be saved.'}
            </p>
          ) : null}
        </>
      )}

      <div className="flex gap-2">
        <Button
          className="min-h-9 text-xs"
          disabled={supersede.isPending || replacementId === ''}
          onClick={() =>
            supersede.mutate(
              { id: decision._id, supersededByDecisionId: replacementId },
              { onSuccess: onDone },
            )
          }
        >
          {supersede.isPending ? 'Saving…' : 'Mark superseded'}
        </Button>
        <Button variant="ghost" className="min-h-9 text-xs" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function DecisionRow({
  projectId,
  decision,
  all,
  onJump,
}: {
  projectId: string;
  decision: Decision;
  all: Decision[];
  onJump: (id: string) => void;
}) {
  const remove = useDeleteDecision();
  const [editing, setEditing] = useState(false);
  const [superseding, setSuperseding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const replacement = all.find((entry) => entry._id === decision.supersededByDecisionId);
  const replaces = all.filter((entry) => entry.supersededByDecisionId === decision._id);
  const candidates = all.filter((entry) => entry._id !== decision._id);

  const blockedBy =
    remove.error instanceof ApiRequestError && remove.error.status === 409
      ? remove.error.message
      : null;

  if (editing) {
    return (
      <div className="border-b border-slate-100 p-4 last:border-0">
        <DecisionForm
          projectId={projectId}
          decision={decision}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <article
      id={`decision-${decision._id}`}
      className={`border-b border-slate-100 p-4 last:border-0 ${
        decision.status === 'superseded' ? 'bg-slate-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="text-left text-sm font-medium text-slate-900 hover:underline"
          >
            {decision.title}
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill label={humanise(decision.status)} tone={STATUS_TONES[decision.status]} />
            <span className="text-xs text-slate-500">
              {decision.decidedAt ? shortDate(decision.decidedAt) : 'no date recorded'}
            </span>
          </div>

          {replacement ? (
            <p className="mt-1.5 text-xs text-amber-800">
              Replaced by{' '}
              <button
                type="button"
                onClick={() => onJump(replacement._id)}
                className="underline underline-offset-2 hover:text-amber-900"
              >
                {replacement.title}
              </button>
            </p>
          ) : null}

          {replaces.length > 0 ? (
            <p className="mt-1.5 text-xs text-slate-500">
              Replaces{' '}
              {replaces.map((entry, index) => (
                <span key={entry._id}>
                  {index > 0 ? ', ' : ''}
                  <button
                    type="button"
                    onClick={() => onJump(entry._id)}
                    className="underline underline-offset-2 hover:text-slate-900"
                  >
                    {entry.title}
                  </button>
                </span>
              ))}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-1">
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
          {decision.status === 'superseded' ? null : (
            <Button
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              onClick={() => setSuperseding((current) => !current)}
            >
              Supersede this
            </Button>
          )}
        </div>
      </div>

      {expanded ? (
        <dl className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {[
            { term: 'Context', value: decision.context },
            { term: 'The choice', value: decision.decision },
            { term: 'Alternatives rejected', value: decision.alternativesRejected },
          ].map((row) => (
            <div key={row.term}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{row.term}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-800">
                {row.value || '—'}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {superseding ? (
        <SupersedeForm
          decision={decision}
          candidates={candidates}
          onDone={() => setSuperseding(false)}
        />
      ) : null}

      {confirming ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-red-900">Delete this decision?</p>
            <Button
              variant="danger"
              className="min-h-9 text-xs"
              disabled={remove.isPending}
              onClick={() => remove.mutate(decision._id, { onSuccess: () => setConfirming(false) })}
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

          {blockedBy ? <p className="mt-2 text-sm text-red-900">{blockedBy}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

export function DecisionsPanel({ projectId }: { projectId: string }) {
  const decisions = useDecisions(projectId);
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [adding, setAdding] = useState(false);

  const all = decisions.data?.items ?? [];
  const supersededCount = all.filter((entry) => entry.status === 'superseded').length;
  const visible = showSuperseded ? all : all.filter((entry) => entry.status !== 'superseded');

  function jumpTo(id: string): void {
    setShowSuperseded(true);
    // The row may have been hidden a moment ago, so scroll after it renders.
    requestAnimationFrame(() => {
      document.getElementById(`decision-${id}`)?.scrollIntoView({ block: 'center' });
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Decisions</h3>

        <div className="flex items-center gap-3">
          {supersededCount > 0 ? (
            <label className="inline-flex min-h-9 items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={showSuperseded}
                onChange={(event) => setShowSuperseded(event.target.checked)}
              />
              Show superseded ({supersededCount})
            </label>
          ) : null}

          {adding ? null : (
            <Button
              variant="secondary"
              className="min-h-9 text-xs"
              onClick={() => setAdding(true)}
            >
              Record decision
            </Button>
          )}
        </div>
      </div>

      {decisions.isPending ? (
        <div className="p-4">
          <LoadingState label="Loading decisions…" />
        </div>
      ) : null}

      {decisions.isError ? (
        <div className="p-4">
          <ErrorState error={decisions.error} onRetry={() => void decisions.refetch()} />
        </div>
      ) : null}

      {adding ? (
        <div className="border-b border-slate-100 p-4">
          <DecisionForm projectId={projectId} onDone={() => setAdding(false)} />
        </div>
      ) : null}

      {decisions.isSuccess && visible.length === 0 && !adding ? (
        <div className="p-4">
          <EmptyState
            title={all.length === 0 ? 'No decisions recorded' : 'Nothing but superseded decisions'}
            whatToDoNext={
              all.length === 0
                ? 'Record the choices that will look arbitrary in six months — why Atlas over Postgres, why the mobile app is its own project, why that vendor and not the cheaper one.'
                : 'Every decision here has been replaced. Turn on “show superseded” to read the trail.'
            }
            action={
              all.length === 0 ? (
                <Button onClick={() => setAdding(true)}>Record the first decision</Button>
              ) : null
            }
          />
        </div>
      ) : null}

      {visible.map((decision) => (
        <DecisionRow
          key={decision._id}
          projectId={projectId}
          decision={decision}
          all={all}
          onJump={jumpTo}
        />
      ))}
    </section>
  );
}

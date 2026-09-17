import {
  FEATURE_BOARD_COLUMNS,
  FEATURE_ORDER_GAP,
  renderFeatureTicket,
  type Feature,
  type FeatureStatus,
  type Project,
} from '@wroom/shared';
import { useEffect, useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PriorityPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';
import { useProject } from '../projects/api';
import { useCreateFeature, useFeatures, useMoveFeature } from './api';
import { readLastCopied, sinceCopied, writeLastCopied, type LastCopied } from './lastCopied';

/**
 * The Kanban board.
 *
 * Moving a card is a select rather than a drag: this app has to work one-handed
 * at 390px, and a drag target that small is a worse control than a menu.
 */

/**
 * Long enough to answer the prompt without hurrying, short enough that the card
 * is back to its normal self before you look away.
 */
const PROMPT_FOR_MS = 6000;

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Puts the card's ticket on the clipboard.
 *
 * Dependencies and siblings come from the board's own list — the ticket is
 * assembled from what is already on screen, so pressing this costs no request.
 */
function useCopyTicket({
  feature,
  featuresById,
  onCopied,
}: {
  feature: Feature;
  featuresById: Map<string, Feature>;
  onCopied: () => void;
}) {
  const [state, setState] = useState<CopyState>('idle');

  // Only the success state expires. A failure stays until the next attempt —
  // it is the one message worth reading twice.
  useEffect(() => {
    if (state !== 'copied') return;
    const timer = window.setTimeout(() => setState('idle'), PROMPT_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy(project: Project): Promise<void> {
    const deps = feature.dependsOnFeatureIds
      .map((id) => featuresById.get(id))
      .filter((dependency): dependency is Feature => dependency !== undefined);

    const siblings = [...featuresById.values()].filter((other) => other._id !== feature._id);

    try {
      // Throws rather than resolving when the page is not on a secure origin,
      // so the whole call sits inside the try.
      await navigator.clipboard.writeText(
        renderFeatureTicket({ feature, project, siblings, deps }),
      );
      setState('copied');
      onCopied();
    } catch {
      setState('failed');
    }
  }

  return {
    state,
    dismiss: () => setState('idle'),
    start: (project: Project) => {
      setState('idle');
      void copy(project);
    },
  };
}

function FeatureCard({
  feature,
  project,
  featuresById,
  onMove,
  onCopied,
  lastCopiedAt,
  isMoving,
}: {
  feature: Feature;
  project: Project | undefined;
  featuresById: Map<string, Feature>;
  onMove: (status: FeatureStatus) => void;
  onCopied: () => void;
  /** Set only on the one card copied most recently; null on every other. */
  lastCopiedAt: string | null;
  isMoving: boolean;
}) {
  const ticket = useCopyTicket({ feature, featuresById, onCopied });

  // Copying a ticket is how work starts, so the card that was copied last is
  // almost always the card that should be in progress. Both the mark and the
  // prompt exist to make forgetting that visible.
  const isMarked = lastCopiedAt !== null;
  const askToMove = ticket.state === 'copied' && feature.status !== 'in-progress';

  return (
    <article
      className={`rounded-lg border p-3 ${
        isMarked ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-mono text-slate-500">{feature.ref}</p>
        <PriorityPill priority={feature.priority} />
      </div>

      <p className="mt-1 text-sm font-medium text-slate-900">{feature.title}</p>

      {lastCopiedAt !== null ? (
        <p className="mt-1 text-xs font-medium text-amber-700">
          Last copied · {sinceCopied(lastCopiedAt)}
        </p>
      ) : null}

      {feature.blockedReason ? (
        <p className="mt-1 text-xs text-red-600">Blocked: {feature.blockedReason}</p>
      ) : null}

      <label className="sr-only" htmlFor={`move-${feature._id}`}>
        Move {feature.ref}
      </label>

      {/* The two actions sit side by side and wrap when the column is too narrow. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          id={`move-${feature._id}`}
          className="min-h-9 min-w-32 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600"
          value={feature.status}
          disabled={isMoving}
          onChange={(event) => onMove(event.target.value as FeatureStatus)}
        >
          {FEATURE_BOARD_COLUMNS.map((column) => (
            <option key={column} value={column}>
              Move to {humanise(column)}
            </option>
          ))}
        </select>

        <Button
          variant="secondary"
          className="min-h-9 shrink-0 text-xs"
          disabled={project === undefined}
          title={project === undefined ? 'Waiting for the project details' : undefined}
          onClick={() => {
            if (project === undefined) return;
            ticket.start(project);
          }}
        >
          {ticket.state === 'copied' ? 'Copied' : 'Copy ticket'}
        </Button>

        {ticket.state === 'failed' ? (
          <p className="basis-full text-xs text-red-600">
            The browser would not let the page copy. Select the ticket by hand, or open the portal
            over https.
          </p>
        ) : null}
      </div>

      {/* Asked here, a breath after the copy, because that is the moment the
          move gets forgotten — not later, looking at a board that lies. */}
      {askToMove ? (
        <div className="mt-2 rounded-md bg-amber-100 p-2" role="status">
          <p className="text-xs text-amber-900">Copied. Move it to In progress?</p>

          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              className="min-h-9 flex-1 text-xs"
              disabled={isMoving}
              onClick={() => {
                onMove('in-progress');
                ticket.dismiss();
              }}
            >
              Move to In progress
            </Button>
            <Button variant="ghost" className="min-h-9 text-xs" onClick={ticket.dismiss}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function NewFeatureForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const create = useCreateFeature(projectId);
  const [ref, setRef] = useState('');
  const [title, setTitle] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');

  const fieldErrors = create.error instanceof ApiRequestError ? create.error.fieldErrors : {};

  return (
    <form
      className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({ ref, title, acceptanceCriteria }, { onSuccess: onDone });
      }}
    >
      <Field
        label="Ref"
        htmlFor="feature-ref"
        hint="Used in branch names and PR titles, e.g. HOLO-014."
        required
        error={fieldErrors.ref}
      >
        <input
          id="feature-ref"
          className={inputClasses}
          value={ref}
          placeholder="HOLO-014"
          onChange={(event) => setRef(event.target.value.toUpperCase())}
          required
        />
      </Field>

      <Field label="Title" htmlFor="feature-title" required error={fieldErrors.title}>
        <input
          id="feature-title"
          className={inputClasses}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Acceptance criteria"
        htmlFor="feature-acceptance"
        hint="One or two lines. This becomes the ticket's exit criteria."
        error={fieldErrors.acceptanceCriteria}
      >
        <textarea
          id="feature-acceptance"
          rows={2}
          className={inputClasses}
          value={acceptanceCriteria}
          onChange={(event) => setAcceptanceCriteria(event.target.value)}
        />
      </Field>

      {create.isError ? (
        <p className="text-sm text-red-600">
          {create.error instanceof ApiRequestError ? create.error.message : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending || title.trim() === ''}>
          {create.isPending ? 'Adding…' : 'Add feature'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function FeatureBoard({ projectId }: { projectId: string }) {
  const features = useFeatures(projectId);
  const move = useMoveFeature(projectId);
  // The same query the page around this board already holds, so this reads the
  // cache rather than making a second request for it.
  const project = useProject(projectId);
  const [isAdding, setIsAdding] = useState(false);
  const [lastCopied, setLastCopied] = useState<LastCopied | null>(null);

  // Read per project, and re-read when the board is pointed at another one, so
  // the mark never carries across from the project you were just looking at.
  useEffect(() => setLastCopied(readLastCopied(projectId)), [projectId]);

  // "just now" has to stop being true on its own. Nothing else on the board
  // ages while you watch it, so this ticks only while a card is marked.
  const [, setElapsed] = useState(0);
  useEffect(() => {
    if (lastCopied === null) return;
    const timer = window.setInterval(() => setElapsed((count) => count + 1), 60_000);
    return () => window.clearInterval(timer);
  }, [lastCopied]);

  if (features.isPending) return <LoadingState label="Loading the board…" />;
  if (features.isError) {
    return <ErrorState error={features.error} onRetry={() => void features.refetch()} />;
  }

  const items = features.data.items;

  if (items.length === 0 && !isAdding) {
    return (
      <EmptyState
        title="No features on this project yet"
        whatToDoNext="Add the first one with a ref like HOLO-001 and a line of acceptance criteria — that ref is what branch names and PR titles use."
        action={<Button onClick={() => setIsAdding(true)}>Add a feature</Button>}
      />
    );
  }

  // One lookup for the whole board — a card's dependencies are ids, and this is
  // what turns them into refs and titles without another request.
  const featuresById = new Map(items.map((feature) => [feature._id, feature]));

  const lastOrderIn = (status: FeatureStatus) =>
    items
      .filter((feature) => feature.status === status)
      .reduce((highest, feature) => Math.max(highest, feature.order), 0);

  return (
    <div>
      {isAdding ? (
        <NewFeatureForm projectId={projectId} onDone={() => setIsAdding(false)} />
      ) : (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onClick={() => setIsAdding(true)}>
            Add feature
          </Button>
        </div>
      )}

      {move.isError ? (
        <div className="mb-4">
          <ErrorState error={move.error} />
        </div>
      ) : null}

      {/* Columns scroll sideways on a phone rather than squashing to unreadable widths. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex min-w-max gap-3">
          {FEATURE_BOARD_COLUMNS.map((column) => {
            const columnItems = items
              .filter((feature) => feature.status === column)
              .sort((a, b) => a.order - b.order);

            return (
              <section key={column} className="w-64 shrink-0">
                <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {humanise(column)}
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                    {columnItems.length}
                  </span>
                </h3>

                <div className="space-y-2 rounded-xl bg-slate-100 p-2">
                  {columnItems.length === 0 ? (
                    <p className="p-3 text-xs text-slate-500">Nothing here.</p>
                  ) : (
                    columnItems.map((feature) => (
                      <FeatureCard
                        key={feature._id}
                        feature={feature}
                        project={project.data}
                        featuresById={featuresById}
                        isMoving={move.isPending}
                        lastCopiedAt={
                          lastCopied?.featureId === feature._id ? lastCopied.copiedAt : null
                        }
                        onCopied={() => setLastCopied(writeLastCopied(projectId, feature._id))}
                        onMove={(status) => {
                          if (status === feature.status) return;
                          move.mutate({
                            id: feature._id,
                            status,
                            order: lastOrderIn(status) + FEATURE_ORDER_GAP,
                          });
                        }}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

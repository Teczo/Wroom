import { FEATURE_BOARD_COLUMNS, FEATURE_ORDER_GAP, type Feature, type FeatureStatus } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PriorityPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';
import { useCreateFeature, useFeatures, useMoveFeature } from './api';

/**
 * The Kanban board.
 *
 * Moving a card is a select rather than a drag: this app has to work one-handed
 * at 390px, and a drag target that small is a worse control than a menu.
 */

function FeatureCard({
  feature,
  onMove,
  isMoving,
}: {
  feature: Feature;
  onMove: (status: FeatureStatus) => void;
  isMoving: boolean;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-mono text-slate-500">{feature.ref}</p>
        <PriorityPill priority={feature.priority} />
      </div>

      <p className="mt-1 text-sm font-medium text-slate-900">{feature.title}</p>

      {feature.blockedReason ? (
        <p className="mt-1 text-xs text-red-600">Blocked: {feature.blockedReason}</p>
      ) : null}

      <label className="sr-only" htmlFor={`move-${feature._id}`}>
        Move {feature.ref}
      </label>
      <select
        id={`move-${feature._id}`}
        className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600"
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
  const [isAdding, setIsAdding] = useState(false);

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
                        isMoving={move.isPending}
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

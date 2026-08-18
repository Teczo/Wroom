import type { Feature, FeatureStatus } from '@wroom/shared';
import { FEATURE_BOARD_COLUMNS, FEATURE_ORDER_GAP } from '@wroom/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill, PriorityPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { DependencyPicker } from '../../features/features/DependencyPicker';
import { useFeatures, useMoveFeature } from '../../features/features/api';
import { useProject } from '../../features/projects/api';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';

/**
 * The board.
 *
 * Dragging uses the browser's own drag-and-drop, which costs nothing and works
 * with a mouse or trackpad. It does not fire for touch — no browser sends drag
 * events from a finger — and making it would need a dependency, which WRM-026
 * forbids. So every card also carries a "move to" menu, which is the ticket's
 * approved mobile path and the only one that works at 390px.
 */

type DropTarget = { status: FeatureStatus; beforeFeatureId: string | null };

/**
 * Where a card lands. Between two cards it takes the midpoint; at either end it
 * takes a full gap beyond its new neighbour. The service rebalances the column
 * when repeated midpoints leave no room.
 */
function orderFor(column: Feature[], beforeFeatureId: string | null, movingId: string): number {
  const others = column.filter((feature) => feature._id !== movingId);
  const index =
    beforeFeatureId === null
      ? others.length
      : others.findIndex((feature) => feature._id === beforeFeatureId);

  const at = index === -1 ? others.length : index;
  const before = others[at - 1];
  const after = others[at];

  if (before && after) return (before.order + after.order) / 2;
  if (after) return after.order - FEATURE_ORDER_GAP;
  if (before) return before.order + FEATURE_ORDER_GAP;
  return FEATURE_ORDER_GAP;
}

function Card({
  projectId,
  feature,
  candidates,
  onDragStart,
  onDropBefore,
  onMoveTo,
  isDragging,
}: {
  projectId: string;
  feature: Feature;
  candidates: Feature[];
  onDragStart: () => void;
  onDropBefore: () => void;
  onMoveTo: (status: FeatureStatus) => void;
  isDragging: boolean;
}) {
  const [over, setOver] = useState(false);
  const [showLinks, setShowLinks] = useState(false);

  // "Unmet" is any dependency not yet done — the thing actually holding it up.
  const unmet = (feature.dependencies ?? []).filter(
    (dependency) => dependency.status !== 'done',
  );

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        onDropBefore();
      }}
      className={`rounded-lg border bg-white p-3 ${
        isDragging ? 'opacity-40' : ''
      } ${over ? 'border-slate-900 border-t-4' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">{feature.ref}</span>
        <PriorityPill priority={feature.priority} />
      </div>

      <p className="mt-1 text-sm font-medium text-slate-900">{feature.title}</p>

      {feature.blockedReason ? (
        <p className="mt-1.5 rounded bg-red-50 px-2 py-1 text-xs text-red-800">
          Blocked: {feature.blockedReason}
        </p>
      ) : null}

      {unmet.length > 0 ? (
        <p className="mt-1.5 text-xs text-amber-700" title={unmet.map((d) => d.ref).join(', ')}>
          ⏳ waiting on {unmet.map((dependency) => dependency.ref).join(', ')}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Pill label={feature.size.toUpperCase()} />
        {feature.labels.map((label) => (
          <Pill key={label} label={label} tone="blue" />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowLinks((current) => !current)}
        className="mt-2 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900"
      >
        {showLinks ? 'Hide dependencies' : 'Dependencies'}
      </button>

      {showLinks ? (
        <DependencyPicker projectId={projectId} feature={feature} candidates={candidates} />
      ) : null}

      {/* The touch path. A drag target this size is not usable with a thumb. */}
      <label className="mt-2 block">
        <span className="sr-only">Move {feature.ref} to another column</span>
        <select
          className="min-h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600"
          value={feature.status}
          onChange={(event) => onMoveTo(event.target.value as FeatureStatus)}
        >
          {FEATURE_BOARD_COLUMNS.map((status) => (
            <option key={status} value={status}>
              {humanise(status)}
            </option>
          ))}
        </select>
      </label>
    </li>
  );
}

export function ProjectBoardPage() {
  const { id = '' } = useParams();
  const project = useProject(id);
  const features = useFeatures(id);
  const move = useMoveFeature(id);

  const [dragging, setDragging] = useState<Feature | null>(null);
  const [overColumn, setOverColumn] = useState<FeatureStatus | null>(null);
  const [blocking, setBlocking] = useState<{ feature: Feature; target: DropTarget } | null>(null);
  const [reason, setReason] = useState('');

  const items = features.data?.items ?? [];

  const columnOf = (status: FeatureStatus) =>
    items
      .filter((feature) => feature.status === status)
      .sort((left, right) => left.order - right.order);

  function apply(feature: Feature, target: DropTarget, blockedReason?: string): void {
    const order = orderFor(columnOf(target.status), target.beforeFeatureId, feature._id);
    if (feature.status === target.status && feature.order === order) return;

    // Into `blocked`, the reason is asked for first. Moving optimistically and
    // then snapping back because the API refused would be the worse experience.
    if (target.status === 'blocked' && !blockedReason?.trim()) {
      setBlocking({ feature, target });
      return;
    }

    move.mutate({
      id: feature._id,
      status: target.status,
      order,
      blockedReason: blockedReason ?? null,
    });
  }

  if (features.isPending || project.isPending) {
    return (
      <>
        <PageHeader title="Board" />
        <LoadingState label="Loading the board…" />
      </>
    );
  }

  if (features.isError) {
    return (
      <>
        <PageHeader title="Board" />
        <ErrorState error={features.error} onRetry={() => void features.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={project.data ? `${project.data.name} board` : 'Board'}
        subtitle={`${items.length} feature${items.length === 1 ? '' : 's'}`}
        actions={
          <Link to={`/projects/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
            Back to project
          </Link>
        }
      />

      {move.isError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-900">
            {move.error instanceof ApiRequestError
              ? move.error.message
              : 'That move could not be saved.'}
          </p>
          <p className="mt-1 text-xs text-red-700">The card has been put back where it was.</p>
        </div>
      ) : null}

      {blocking ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            What is blocking {blocking.feature.ref}?
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            It will not move to blocked without a reason.
          </p>

          <input
            className={`${inputClasses} mt-3`}
            value={reason}
            autoFocus
            placeholder="Waiting on the client to confirm the schema"
            onChange={(event) => setReason(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || reason.trim() === '') return;
              apply(blocking.feature, blocking.target, reason);
              setBlocking(null);
              setReason('');
            }}
          />

          <div className="mt-3 flex gap-2">
            <Button
              className="min-h-9 text-xs"
              disabled={reason.trim() === ''}
              onClick={() => {
                apply(blocking.feature, blocking.target, reason);
                setBlocking(null);
                setReason('');
              }}
            >
              Move to blocked
            </Button>
            <Button
              variant="ghost"
              className="min-h-9 text-xs"
              onClick={() => {
                setBlocking(null);
                setReason('');
              }}
            >
              Leave it where it is
            </Button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="No features on this project yet"
          whatToDoNext="The board fills up from the project's Features tab — add the first one there with a ref like HOLO-001, and it will appear in backlog."
          action={
            <Link to={`/projects/${id}`}>
              <Button>Go to Features</Button>
            </Link>
          }
        />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
          {FEATURE_BOARD_COLUMNS.map((status) => {
            const column = columnOf(status);

            return (
              <section
                key={status}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverColumn(status);
                }}
                onDragLeave={() => setOverColumn(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setOverColumn(null);
                  if (dragging) apply(dragging, { status, beforeFeatureId: null });
                  setDragging(null);
                }}
                className={`flex w-[85vw] shrink-0 snap-center flex-col rounded-xl border sm:w-72 ${
                  overColumn === status
                    ? 'border-slate-900 bg-slate-100'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {humanise(status)}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                    {column.length}
                  </span>
                </header>

                <ul className="flex flex-1 flex-col gap-2 p-2">
                  {column.map((feature) => (
                    <Card
                      key={feature._id}
                      projectId={id}
                      feature={feature}
                      candidates={items}
                      isDragging={dragging?._id === feature._id}
                      onDragStart={() => setDragging(feature)}
                      onDropBefore={() => {
                        if (dragging) apply(dragging, { status, beforeFeatureId: feature._id });
                        setDragging(null);
                      }}
                      onMoveTo={(next) => apply(feature, { status: next, beforeFeatureId: null })}
                    />
                  ))}

                  {column.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                      Nothing here
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

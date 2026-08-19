import { ASSET_KINDS, PUBLISH_GATE_MESSAGES, type PublishGateReason } from '@wroom/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import {
  useAssets,
  useReorderAssets,
  useUpdateAsset,
  type AssetWithPublishState,
} from '../../features/assets/api';
import { useProject } from '../../features/projects/api';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';

/**
 * The asset library: describe, order and set who may see each file.
 *
 * Whether something can reach the portfolio is decided by the shared gate
 * function on the server — this screen renders the answer and the reasons it
 * comes with. It never works the three conditions out for itself.
 *
 * Reordering is up/down buttons rather than dragging: dragging by touch needs a
 * dependency, and this has to work at 390px.
 */

const VISIBILITY_TONES = {
  private: 'neutral',
  'client-only': 'blue',
  public: 'red',
} as const;

function VisibilityBadge({ visibility }: { visibility: string }) {
  const tone = VISIBILITY_TONES[visibility as keyof typeof VISIBILITY_TONES] ?? 'neutral';

  return (
    <Pill
      label={visibility === 'public' ? 'PUBLIC' : visibility === 'private' ? 'Private' : 'Client only'}
      tone={tone}
    />
  );
}

function AssetCard({
  projectId,
  asset,
  index,
  total,
  onMove,
}: {
  projectId: string;
  asset: AssetWithPublishState;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const update = useUpdateAsset(projectId);
  const [editing, setEditing] = useState(false);
  const [confirmPublic, setConfirmPublic] = useState(false);

  const [title, setTitle] = useState(asset.title);
  const [caption, setCaption] = useState(asset.caption);
  const [altText, setAltText] = useState(asset.altText);
  const [device, setDevice] = useState(asset.device);
  const [kind, setKind] = useState<string>(asset.kind);

  const errors = update.error instanceof ApiRequestError ? update.error.fieldErrors : {};

  // Gates other than the asset's own — those are what this screen cannot fix.
  const otherGates = asset.publishState.blockedBy.filter(
    (reason) => reason !== 'asset-not-public',
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <VisibilityBadge visibility={asset.visibility} />
            <Pill label={asset.kind} tone="blue" />
          </div>

          <p className="mt-1.5 truncate text-sm font-medium text-slate-900">
            {asset.title || asset.filename}
          </p>
          {asset.caption ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{asset.caption}</p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">No caption</p>
          )}
          {asset.device ? <p className="mt-0.5 text-xs text-slate-500">{asset.device}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            >
              ↓
            </Button>
          </div>
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? 'Close' : 'Edit'}
          </Button>
        </div>
      </div>

      {asset.visibility === 'public' && otherGates.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-900">
            Marked public, but it will not appear in the portfolio yet
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs text-amber-800">
            {otherGates.map((reason: PublishGateReason) => (
              <li key={reason}>{PUBLISH_GATE_MESSAGES[reason]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {asset.visibility === 'public' && asset.publishState.publishable ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Eligible for the portfolio. It appears there once the project is published — publishing
          is still a separate, deliberate action.
        </p>
      ) : null}

      {editing ? (
        <form
          className="mt-4 space-y-3 border-t border-slate-100 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate(
              { id: asset._id, title, caption, altText, device, kind },
              { onSuccess: () => setEditing(false) },
            );
          }}
        >
          <Field label="Title" htmlFor={`title-${asset._id}`} error={errors.title}>
            <input
              id={`title-${asset._id}`}
              className={inputClasses}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field label="Caption" htmlFor={`caption-${asset._id}`} error={errors.caption}>
            <textarea
              id={`caption-${asset._id}`}
              rows={2}
              className={inputClasses}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </Field>

          <Field
            label="Alt text"
            htmlFor={`alt-${asset._id}`}
            hint="What a screen reader announces in place of the image. Describe what it shows, not that it is a screenshot."
            error={errors.altText}
          >
            <input
              id={`alt-${asset._id}`}
              className={inputClasses}
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Device"
              htmlFor={`device-${asset._id}`}
              hint="What it was captured on."
              error={errors.device}
            >
              <input
                id={`device-${asset._id}`}
                className={inputClasses}
                value={device}
                onChange={(event) => setDevice(event.target.value)}
              />
            </Field>

            <Field label="Kind" htmlFor={`kind-${asset._id}`} error={errors.kind}>
              <select
                id={`kind-${asset._id}`}
                className={inputClasses}
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {ASSET_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {humanise(value)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {update.isError ? (
            <p className="text-sm text-red-600">
              {update.error instanceof ApiRequestError
                ? update.error.message
                : 'That could not be saved.'}
            </p>
          ) : null}

          <Button type="submit" className="min-h-9 text-xs" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">Who can see it:</span>

        {asset.visibility !== 'public' ? (
          <>
            <Button
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={update.isPending || asset.visibility === 'private'}
              onClick={() => update.mutate({ id: asset._id, visibility: 'private' })}
            >
              Private
            </Button>
            <Button
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={update.isPending || asset.visibility === 'client-only'}
              onClick={() => update.mutate({ id: asset._id, visibility: 'client-only' })}
            >
              Client only
            </Button>
            <Button
              variant="secondary"
              className="min-h-9 px-2 text-xs"
              onClick={() => setConfirmPublic(true)}
            >
              Make public…
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: asset._id, visibility: 'private' })}
          >
            Make it private again
          </Button>
        )}
      </div>

      {confirmPublic ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-900">Make this asset public?</p>
          <p className="mt-1 text-xs text-red-800">
            This marks it eligible for the public portfolio — anyone on the internet could see it
            once the project is published. It does not publish anything by itself.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="danger"
              className="min-h-9 text-xs"
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  { id: asset._id, visibility: 'public' },
                  { onSuccess: () => setConfirmPublic(false) },
                )
              }
            >
              {update.isPending ? 'Saving…' : 'Yes, make it public'}
            </Button>
            <Button
              variant="ghost"
              className="min-h-9 text-xs"
              onClick={() => setConfirmPublic(false)}
            >
              Keep it private
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ProjectAssetsPage() {
  const { id = '' } = useParams();
  const project = useProject(id);
  const assets = useAssets(id);
  const reorder = useReorderAssets(id);

  const items = assets.data?.items ?? [];

  function move(index: number, direction: -1 | 1): void {
    const next = [...items];
    const target = index + direction;
    [next[index], next[target]] = [next[target]!, next[index]!];

    reorder.mutate(next.map((asset) => asset._id));
  }

  return (
    <>
      <PageHeader
        title={project.data ? `${project.data.name} media` : 'Media'}
        subtitle={`${items.length} file${items.length === 1 ? '' : 's'}. Nothing is public unless you make it so.`}
        actions={
          <Link to={`/projects/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
            Back to project
          </Link>
        }
      />

      {assets.isPending ? <LoadingState label="Loading media…" /> : null}

      {assets.isError ? (
        <ErrorState error={assets.error} onRetry={() => void assets.refetch()} />
      ) : null}

      {reorder.isError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          That order could not be saved.
        </p>
      ) : null}

      {assets.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No media on this project yet"
          whatToDoNext="Upload a screenshot or a video from the project page, then come back here to caption it and decide who can see it."
          action={
            <Link to={`/projects/${id}`}>
              <Button>Go to the project</Button>
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {items.map((asset, index) => (
          <AssetCard
            key={asset._id}
            projectId={id}
            asset={asset}
            index={index}
            total={items.length}
            onMove={(direction) => move(index, direction)}
          />
        ))}
      </div>
    </>
  );
}

import type { Asset } from '@wroom/shared';
import { UPLOAD_LIMITS } from '@wroom/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { shortDate } from '../../lib/format';
import { useAssets, useCreateAsset, useDeleteAsset, useRequestUploadUrl } from './api';
import { useBlobUpload } from './upload';

/**
 * A project's media: what has been uploaded, and the box that adds to it.
 *
 * The upload itself lives in `upload.ts` — the browser PUTs straight to Azure
 * on a signed URL and the file never passes through the API. The site's own
 * portrait goes up the same way, through the same hook, with a different pair
 * of endpoints.
 */

function megabytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))}KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function AssetRow({ projectId, asset }: { projectId: string; asset: Asset }) {
  const remove = useDeleteAsset(projectId);
  const [confirming, setConfirming] = useState(false);

  /*
   * No <img> here on purpose. The container is private — as it should be — so
   * the browser cannot fetch a blob URL directly and would render a broken
   * image for every row. Showing a thumbnail needs a short-lived read SAS,
   * which this ticket does not scope. A type badge is honest; a broken image
   * is not.
   */
  const extension = asset.filename.split('.').pop()?.slice(0, 4).toUpperCase();

  return (
    <div className="flex items-start gap-3 border-b border-slate-100 p-4 last:border-0">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <span className="text-xs font-semibold text-slate-500">{extension ?? 'FILE'}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{asset.filename}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Pill label={asset.kind} tone="blue" />
          <Pill label={asset.visibility} />
          <span className="text-xs text-slate-500">{megabytes(asset.sizeBytes)}</span>
          {asset.width && asset.height ? (
            <span className="text-xs text-slate-500">
              {asset.width}×{asset.height}
            </span>
          ) : null}
          {asset.durationSec ? (
            <span className="text-xs text-slate-500">{asset.durationSec}s</span>
          ) : null}
          <span className="text-xs text-slate-400">{shortDate(asset.createdAt)}</span>
        </div>

        {confirming ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2">
            <p className="text-xs text-red-900">Delete this file for good?</p>
            <Button
              variant="danger"
              className="min-h-9 text-xs"
              disabled={remove.isPending}
              onClick={() => remove.mutate(asset._id, { onSuccess: () => setConfirming(false) })}
            >
              {remove.isPending ? 'Deleting…' : 'Yes, delete'}
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

      <Button
        variant="ghost"
        className="min-h-9 shrink-0 px-2 text-xs text-red-600 hover:bg-red-50"
        onClick={() => setConfirming((current) => !current)}
      >
        Delete
      </Button>
    </div>
  );
}

export function AssetsPanel({ projectId }: { projectId: string }) {
  const assets = useAssets(projectId);
  const requestUrl = useRequestUploadUrl(projectId);
  const createAsset = useCreateAsset(projectId);
  const { phase, busy, upload } = useBlobUpload({ requestUrl, createAsset });

  const items = assets.data?.items ?? [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Media</h3>
          {items.length > 0 ? (
            <Link
              to={`/projects/${projectId}/assets`}
              className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900"
            >
              Open the library
            </Link>
          ) : null}
        </div>

        <label className="inline-flex">
          <span className="sr-only">Choose a file to upload</span>
          <input
            type="file"
            accept={UPLOAD_LIMITS.allowedMimeTypes.join(',')}
            capture="environment"
            disabled={busy}
            className="block w-full text-xs text-slate-600 file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:text-sm file:font-medium file:text-white disabled:opacity-50"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void upload(file);
            }}
          />
        </label>
      </div>

      {phase.at === 'requesting' || phase.at === 'saving' ? (
        <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-600">
          {phase.at === 'requesting' ? 'Checking the file…' : 'Saving…'} {phase.filename}
        </p>
      ) : null}

      {phase.at === 'uploading' ? (
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-600">
            Uploading {phase.filename} — {phase.percent}%
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${phase.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {phase.at === 'rejected' ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">That file was not accepted</p>
          <p className="mt-0.5 text-xs text-amber-800">{phase.message}</p>
          <p className="mt-0.5 text-xs text-amber-700">Nothing was uploaded.</p>
        </div>
      ) : null}

      {phase.at === 'failed' ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-900">The upload did not finish</p>
          <p className="mt-0.5 text-xs text-red-800">{phase.message}</p>
          <p className="mt-0.5 text-xs text-red-700">The file was accepted, but the transfer failed. Try again.</p>
        </div>
      ) : null}

      {assets.isPending ? (
        <div className="p-4">
          <LoadingState label="Loading media…" />
        </div>
      ) : null}

      {assets.isError ? (
        <div className="p-4">
          <ErrorState error={assets.error} onRetry={() => void assets.refetch()} />
        </div>
      ) : null}

      {assets.isSuccess && items.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="Nothing uploaded yet"
            whatToDoNext="Add a screenshot or a short demo video. Files are private to Wroom until you publish them — uploading one shows it to nobody."
          />
        </div>
      ) : null}

      {items.map((asset) => (
        <AssetRow key={asset._id} projectId={projectId} asset={asset} />
      ))}
    </section>
  );
}

import { MEDIA_KINDS, MEDIA_SVG_MAX_LENGTH, type MediaKind, type MediaLibraryItem } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ApiRequestError } from '../../lib/api';
import { MarkPreview } from './MarkPreview';
import { useCreateMark, useUpdateMark } from './api';

const KIND_HINTS: Record<MediaKind, string> = {
  tech: 'A "built with" logo — React, Azure, MongoDB.',
  platform: 'Where something runs — web, desktop, VR, mobile, tablet.',
  client: "A client's own mark. Only approve one you have permission to show.",
  social: 'A link mark — GitHub, LinkedIn, email.',
};

/**
 * Create or edit one mark.
 *
 * The same form does both, because the only difference is that `key` is fixed
 * once the record exists — projects point at a mark by key and nothing rewrites
 * those references, so the API refuses a rename and the field says so rather
 * than letting you type one and get a 400 back.
 */
export function MarkForm({ mark, onDone }: { mark: MediaLibraryItem | null; onDone: () => void }) {
  const create = useCreateMark();
  const update = useUpdateMark();
  const save = mark ? update : create;

  const [kind, setKind] = useState<MediaKind>(mark?.kind ?? 'tech');
  const [key, setKey] = useState(mark?.key ?? '');
  const [label, setLabel] = useState(mark?.label ?? '');
  const [svg, setSvg] = useState(mark?.svg ?? '');
  const [blobUrl, setBlobUrl] = useState(mark?.blobUrl ?? '');
  const [usageApproved, setUsageApproved] = useState(mark?.usageApproved ?? true);
  const [sortOrder, setSortOrder] = useState(String(mark?.sortOrder ?? 0));

  const errors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};
  const topLevel =
    save.error instanceof ApiRequestError && Object.keys(errors).length === 0
      ? save.error.message
      : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const body = {
      kind,
      label,
      // An empty string is a real value here — clearing a mark's markup has to
      // be possible — but the two are alternatives, so an empty blobUrl is null.
      svg,
      blobUrl: blobUrl.trim() === '' ? null : blobUrl.trim(),
      usageApproved,
      sortOrder: Number(sortOrder) || 0,
    };

    if (mark) {
      update.mutate({ id: mark._id, ...body }, { onSuccess: onDone });
    } else {
      create.mutate({ ...body, key }, { onSuccess: onDone });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <Field label="Kind" htmlFor="mark-kind" hint={KIND_HINTS[kind]} required>
        <select
          id="mark-kind"
          className={inputClasses}
          value={kind}
          onChange={(event) => setKind(event.target.value as MediaKind)}
        >
          {MEDIA_KINDS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Key"
        htmlFor="mark-key"
        required
        error={errors.key}
        hint={
          mark
            ? 'Fixed once the mark exists — projects reference it by this.'
            : 'Lowercase, no spaces. This is what a project points at, e.g. "react".'
        }
      >
        <input
          id="mark-key"
          className={`${inputClasses} font-mono disabled:bg-slate-100 disabled:text-slate-500`}
          value={key}
          disabled={Boolean(mark)}
          onChange={(event) => setKey(event.target.value)}
          placeholder="react"
        />
      </Field>

      <Field label="Label" htmlFor="mark-label" required error={errors.label}>
        <input
          id="mark-label"
          className={inputClasses}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="React"
        />
      </Field>

      <Field
        label="SVG"
        htmlFor="mark-svg"
        error={errors.svg}
        hint={`Paste the whole <svg> element. Scripts, event handlers and external links are stripped when it saves. ${svg.length}/${MEDIA_SVG_MAX_LENGTH}`}
      >
        <textarea
          id="mark-svg"
          className={`${inputClasses} min-h-32 font-mono text-xs`}
          value={svg}
          onChange={(event) => setSvg(event.target.value)}
          placeholder='<svg viewBox="0 0 24 24" fill="currentColor">…</svg>'
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-800">Preview</p>
        <MarkPreview svg={svg} blobUrl={blobUrl.trim() === '' ? null : blobUrl.trim()} />
      </div>

      <Field
        label="Image URL"
        htmlFor="mark-blob"
        error={errors.blobUrl}
        hint="The alternative to SVG, for a mark that only exists as a raster image. Leave empty if you pasted SVG."
      >
        <input
          id="mark-blob"
          className={inputClasses}
          value={blobUrl}
          onChange={(event) => setBlobUrl(event.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Field
        label="Sort order"
        htmlFor="mark-order"
        error={errors.sortOrder}
        hint="Lower comes first within its kind."
      >
        <input
          id="mark-order"
          type="number"
          inputMode="numeric"
          className={inputClasses}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
        />
      </Field>

      <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 rounded border-slate-300"
          checked={usageApproved}
          onChange={(event) => setUsageApproved(event.target.checked)}
        />
        <span className="text-sm">
          <span className="font-medium text-slate-800">Approved for use</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Unticking this drops the mark from every published page without deleting the record.
            A brand mark used for &ldquo;built with&rdquo; attribution is fine; a client&rsquo;s
            mark is not, without their permission.
          </span>
        </span>
      </label>

      {topLevel ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{topLevel}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={save.isPending} className="sm:w-auto">
          {save.isPending ? 'Saving…' : mark ? 'Save mark' : 'Add mark'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone} className="sm:w-auto">
          Cancel
        </Button>
      </div>
    </form>
  );
}

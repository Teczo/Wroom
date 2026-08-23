import { MEDIA_KINDS, type MediaKind, type MediaLibraryItem } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { MarkForm } from '../../features/mediaLibrary/MarkForm';
import { MarkGlyph } from '../../features/mediaLibrary/MarkPreview';
import { useDeleteMark, useMediaLibrary } from '../../features/mediaLibrary/api';
import { ApiRequestError } from '../../lib/api';

/**
 * The media library — every mark the public site can draw.
 *
 * Icons are data (CLAUDE.md §7.3), so this screen is where they are curated.
 * Nothing here fetches a mark from anywhere: you paste one in.
 */

const KIND_TITLES: Record<MediaKind, string> = {
  tech: 'Tech',
  platform: 'Platforms',
  client: 'Clients',
  social: 'Social',
};

/** The counts a 409 comes back with, spelled out. */
function blockedBreakdown(details: Record<string, unknown> | undefined): string[] {
  const count = (field: string): number =>
    typeof details?.[field] === 'number' ? (details[field] as number) : 0;

  const lines: string[] = [];
  const tech = count('techStack');
  const platforms = count('platforms');
  const clientLogo = count('clientLogo');

  // The noun and the verb both have to agree — "1 product use it" reads as a bug.
  const one = (n: number, noun: string, singular: string, plural: string) =>
    `${n} ${noun}${n === 1 ? '' : 's'} ${n === 1 ? singular : plural}`;

  if (tech > 0) lines.push(`${one(tech, 'project', 'lists', 'list')} it in their tech stack`);
  if (platforms > 0) {
    lines.push(`${one(platforms, 'project', 'lists', 'list')} it as a platform`);
  }
  if (clientLogo > 0) {
    lines.push(`${one(clientLogo, 'product', 'uses', 'use')} it as the client logo`);
  }

  return lines;
}

function MarkRow({ mark, onEdit }: { mark: MediaLibraryItem; onEdit: () => void }) {
  const remove = useDeleteMark();
  const [confirming, setConfirming] = useState(false);

  const blocked =
    remove.error instanceof ApiRequestError && remove.error.status === 409 ? remove.error : null;
  const otherError =
    remove.error instanceof ApiRequestError && remove.error.status !== 409 ? remove.error : null;

  return (
    <li className="border-b border-slate-100 p-3 last:border-0">
      <div className="flex items-start gap-3">
        {/*
         * The mark at whatever size it declares, on a neutral tile. Nothing
         * forces it to a uniform box — seeing that one mark is twice the size
         * of its neighbours is the point of a library screen.
         */}
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900">
          {mark.svg ? (
            <MarkGlyph svg={mark.svg} className="[&_svg]:max-h-10 [&_svg]:max-w-10" />
          ) : mark.blobUrl ? (
            <img src={mark.blobUrl} alt="" className="max-h-10 max-w-10" />
          ) : (
            <span className="text-[10px] text-slate-400">none</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium text-slate-900">{mark.label || mark.key}</p>
            {mark.usageApproved ? null : <Pill label="Not approved" tone="amber" />}
            {!mark.svg && !mark.blobUrl ? <Pill label="No artwork" tone="neutral" /> : null}
          </div>
          <p className="mt-0.5 font-mono text-xs text-slate-500">{mark.key}</p>
          <p className="mt-0.5 text-xs text-slate-500">order {mark.sortOrder}</p>
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
          <p className="text-sm text-red-900">
            Delete <span className="font-mono">{mark.key}</span>? Any project still pointing at it
            would lose its icon.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate(mark._id, { onSuccess: () => setConfirming(false) })}
            >
              {remove.isPending ? 'Deleting…' : 'Delete it'}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </div>

          {blocked ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Still in use</p>
              {blockedBreakdown(blocked.details).length > 0 ? (
                <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
                  {blockedBreakdown(blocked.details).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-amber-800">{blocked.message}</p>
              )}
              <p className="mt-2 text-xs text-amber-700">
                Remove it from those first, or untick &ldquo;approved for use&rdquo; to drop it
                from published pages while keeping the record.
              </p>
            </div>
          ) : null}

          {otherError ? (
            <p className="mt-3 text-sm text-red-700">{otherError.message}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function MediaLibraryPage() {
  const library = useMediaLibrary();
  const [editing, setEditing] = useState<MediaLibraryItem | null>(null);
  const [adding, setAdding] = useState(false);

  if (library.isPending) {
    return (
      <>
        <PageHeader title="Media library" />
        <LoadingState label="Loading the marks…" />
      </>
    );
  }

  if (library.isError) {
    return (
      <>
        <PageHeader title="Media library" />
        <ErrorState error={library.error} onRetry={() => void library.refetch()} />
      </>
    );
  }

  const marks = library.data.items;
  const showForm = adding || editing !== null;

  function closeForm() {
    setAdding(false);
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        title="Media library"
        subtitle="Every mark the public site can draw. Paste one in and any project can use its key."
        actions={
          showForm ? null : (
            <Button onClick={() => { setEditing(null); setAdding(true); }}>Add a mark</Button>
          )
        }
      />

      {showForm ? (
        <div className="mb-6">
          <MarkForm mark={editing} onDone={closeForm} />
        </div>
      ) : null}

      {marks.length === 0 && !showForm ? (
        <EmptyState
          title="No marks yet"
          whatToDoNext="Run the seed to create the platform and social keys, or add one here: paste an SVG, give it a key like “react”, and it becomes available to every project."
          action={<Button onClick={() => setAdding(true)}>Add a mark</Button>}
        />
      ) : null}

      <div className="space-y-6">
        {MEDIA_KINDS.map((kind) => {
          const inKind = marks
            .filter((mark) => mark.kind === kind)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

          if (inKind.length === 0) return null;

          return (
            <section key={kind}>
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                {KIND_TITLES[kind]}
                <span className="ml-2 text-xs font-normal text-slate-500">{inKind.length}</span>
              </h2>
              <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {inKind.map((mark) => (
                  <MarkRow key={mark._id} mark={mark} onEdit={() => { setAdding(false); setEditing(mark); }} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

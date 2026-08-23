import type { Asset, MediaKind, MediaLibraryItem } from '@wroom/shared';

import { inputClasses } from '../../components/Field';
import { MarkGlyph } from '../mediaLibrary/MarkPreview';
import { useMediaLibrary } from '../mediaLibrary/api';

/**
 * Pickers for the two things the portfolio references by id or key: marks from
 * the media library, and this project's own assets.
 *
 * Marks are chosen from a grid of buttons rather than a `<select>`, because a
 * native option list cannot show the artwork — and picking the right icon out
 * of a list of keys like "vr" and "webxr" is guesswork without seeing it.
 */

function useMarks(kinds: readonly MediaKind[]) {
  const library = useMediaLibrary();
  const all = library.data?.items ?? [];

  return {
    ...library,
    marks: all
      .filter((mark) => kinds.includes(mark.kind))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
  };
}

function MarkButton({
  mark,
  selected,
  onClick,
  badge,
}: {
  mark: MediaLibraryItem;
  selected: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
        selected
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        {mark.svg ? (
          <MarkGlyph svg={mark.svg} className="[&_svg]:max-h-5 [&_svg]:max-w-5" />
        ) : mark.blobUrl ? (
          <img src={mark.blobUrl} alt="" className="max-h-5 max-w-5" />
        ) : (
          <span className="text-[9px] opacity-50">—</span>
        )}
      </span>
      <span className="min-w-0 truncate">{mark.label || mark.key}</span>
      {badge ? <span className="shrink-0 text-[10px] opacity-70">{badge}</span> : null}
    </button>
  );
}

function LibraryHint({ pending, empty }: { pending: boolean; empty: boolean }) {
  if (pending) return <p className="text-xs text-slate-500">Loading marks…</p>;
  if (empty) {
    return (
      <p className="text-xs text-slate-500">
        No marks in the library yet. Add them under Marks, then come back.
      </p>
    );
  }
  return null;
}

/** One mark, or none. Used for a feature card's icon. */
export function MarkPicker({
  value,
  onChange,
  kinds,
}: {
  value: string;
  onChange: (key: string) => void;
  kinds: readonly MediaKind[];
}) {
  const { marks, isPending } = useMarks(kinds);

  return (
    <div>
      <LibraryHint pending={isPending} empty={!isPending && marks.length === 0} />
      <div className="flex flex-wrap gap-1.5">
        {marks.map((mark) => (
          <MarkButton
            key={mark._id}
            mark={mark}
            selected={value === mark.key}
            // Pressing the selected one clears it — an icon is optional.
            onClick={() => onChange(value === mark.key ? '' : mark.key)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Several marks, in the order they were picked.
 *
 * Selection order is kept because a tech grid is arranged by hand and the
 * public site renders it in this order — sorting alphabetically here would
 * silently rearrange somebody's layout on every save.
 */
export function MarkMultiSelect({
  value,
  onChange,
  kinds,
}: {
  value: string[];
  onChange: (keys: string[]) => void;
  kinds: readonly MediaKind[];
}) {
  const { marks, isPending } = useMarks(kinds);

  function toggle(key: string): void {
    onChange(value.includes(key) ? value.filter((entry) => entry !== key) : [...value, key]);
  }

  /** Keys that are selected but no longer in the library — worth saying so. */
  const orphaned = value.filter((key) => !marks.some((mark) => mark.key === key));

  return (
    <div>
      <LibraryHint pending={isPending} empty={!isPending && marks.length === 0} />

      <div className="flex flex-wrap gap-1.5">
        {marks.map((mark) => (
          <MarkButton
            key={mark._id}
            mark={mark}
            selected={value.includes(mark.key)}
            badge={value.includes(mark.key) ? `#${value.indexOf(mark.key) + 1}` : undefined}
            onClick={() => toggle(mark.key)}
          />
        ))}
      </div>

      {orphaned.length > 0 ? (
        <p className="mt-2 text-xs text-amber-700">
          {orphaned.join(', ')} {orphaned.length === 1 ? 'is' : 'are'} selected but not in the
          library. {orphaned.length === 1 ? 'It' : 'They'} will render as nothing until added
          under Marks.
        </p>
      ) : null}

      {value.length > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Shown in the order picked: {value.join(' → ')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One of this project's own assets, or none.
 *
 * A `<select>` here rather than a grid: assets have real names, the list can be
 * long, and a native picker is the better control on a phone for a list of
 * words.
 */
export function AssetPicker({
  id,
  value,
  onChange,
  assets,
  emptyLabel,
}: {
  id: string;
  value: string | null;
  onChange: (assetId: string | null) => void;
  assets: Asset[];
  emptyLabel: string;
}) {
  const chosen = assets.find((asset) => asset._id === value) ?? null;

  return (
    <div>
      <select
        id={id}
        className={inputClasses}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {assets.map((asset) => (
          <option key={asset._id} value={asset._id}>
            {asset.title || asset.filename}
            {asset.visibility === 'public' ? '' : ' — not public'}
          </option>
        ))}
      </select>

      {chosen ? (
        <div className="mt-2 flex items-center gap-2">
          <img
            src={chosen.thumbnailUrl ?? chosen.blobUrl}
            alt=""
            className="size-12 rounded border border-slate-200 object-cover"
          />
          {chosen.visibility === 'public' ? null : (
            <p className="text-xs text-amber-700">
              This asset is not public, so it will not reach the portfolio even once the project
              is published.
            </p>
          )}
        </div>
      ) : null}

      {assets.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          This project has no suitable files yet. Upload one on the Files tab.
        </p>
      ) : null}
    </div>
  );
}

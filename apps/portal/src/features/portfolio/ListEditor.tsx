import type { ReactNode } from 'react';

import { Button } from '../../components/Button';

/**
 * A list you can add to, remove from and reorder.
 *
 * **Reordering is up/down buttons, not drag.** No drag-and-drop library is
 * permitted (CLAUDE.md §3), and the hand-rolled alternative — HTML5 drag events
 * — does not fire on touch at all, which would leave reordering broken on the
 * one device this app exists to be used on (§7). Buttons work with a thumb, a
 * mouse and a keyboard, and a screen reader announces them without any extra
 * wiring.
 *
 * The buttons are disabled rather than hidden at the ends of the list, so the
 * row's controls do not shift position as items move.
 */
export function ListEditor<T>({
  items,
  onChange,
  blank,
  addLabel,
  emptyHint,
  itemLabel,
  children,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  /** A fresh entry, made when Add is pressed. */
  blank: () => T;
  addLabel: string;
  emptyHint: string;
  /** Names one row for assistive tech, e.g. "feature card". */
  itemLabel: string;
  children: (item: T, index: number, update: (next: T) => void) => ReactNode;
}) {
  function move(from: number, to: number): void {
    if (to < 0 || to >= items.length) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved as T);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          {emptyHint}
        </p>
      ) : null}

      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              {itemLabel} {index + 1}
            </span>

            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2 text-xs"
                disabled={index === 0}
                aria-label={`Move ${itemLabel} ${index + 1} up`}
                onClick={() => move(index, index - 1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2 text-xs"
                disabled={index === items.length - 1}
                aria-label={`Move ${itemLabel} ${index + 1} down`}
                onClick={() => move(index, index + 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
                aria-label={`Remove ${itemLabel} ${index + 1}`}
                onClick={() => onChange(items.filter((_, at) => at !== index))}
              >
                Remove
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {children(item, index, (next) =>
              onChange(items.map((existing, at) => (at === index ? next : existing))),
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={() => onChange([...items, blank()])}>
        {addLabel}
      </Button>
    </div>
  );
}

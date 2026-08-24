import { useEffect, useState } from 'react';

import { TypeOut } from '../../components/TypeOut';
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';

/**
 * The decorative terminal beside the hero.
 *
 * The lines are `terminalLines` from the published `landing` record and nothing
 * is written here (§2 rule 8). It is decoration, and it is gone below `md`
 * (§7.7, docs/DATA_MODEL.md) — a phone gets the words instead.
 *
 * Two things keep it out of the way of the first paint, which is what the
 * "nothing above the fold animates" rule is protecting (§7.5):
 *
 * - Every row exists from the first frame at its final height, empty until its
 *   turn comes. The panel is therefore the same size before and after the
 *   type-out, so nothing below it moves and the type-out cannot cost layout
 *   shift.
 * - Nothing fades, lifts or transitions. The panel and its chrome paint at once
 *   and only the characters inside arrive over time, so the headline beside it
 *   is what the browser measures.
 *
 * Under reduced motion every line is present immediately, which is `disables`
 * rather than `reduces` (§7.5). `TypeOut` handles that for the line it is
 * typing; the sequencing below has to handle it for the rest.
 */
const SPEED_MS = 45;

/** Held between one line finishing and the next starting. */
const LINE_PAUSE_MS = 320;

export interface TerminalProps {
  lines: string[];
  className?: string;
}

export function Terminal({ lines, className = '' }: TerminalProps) {
  const reduced = usePrefersReducedMotion();

  // The copy itself, as one value. The array arrives fresh from the parsed
  // record on every render, so it is the words that have to drive the effects
  // below — depending on the array would restart the type-out on every state
  // change it causes.
  const script = lines.join('\n');

  // How many lines have begun. The last of them is the one being typed;
  // everything before it is finished text and everything after it is a row
  // holding its space.
  const [started, setStarted] = useState(reduced ? lines.length : 1);

  // Start over when the copy changes — the record arrives after the first
  // render — or land on the finished state at once if the preference is set.
  useEffect(() => {
    setStarted(reduced ? lines.length : 1);
  }, [script, reduced]);

  useEffect(() => {
    if (reduced || started >= lines.length) return;

    const current = lines[started - 1] ?? '';
    const id = window.setTimeout(
      () => setStarted((count) => count + 1),
      current.length * SPEED_MS + LINE_PAUSE_MS,
    );

    return () => window.clearTimeout(id);
  }, [started, script, reduced]);

  if (lines.length === 0) return null;

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-surface ${className}`}>
      {/*
       * The window bar. Chrome drawn from tokens, not a mark from the library —
       * there is nothing here to look up (§7.3).
       */}
      <div aria-hidden className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>

      <div className="p-4 font-mono text-sm leading-5 text-fg">
        {lines.map((line, index) => (
          // The index is the key on purpose: these are lines of a fixed script,
          // and two identical lines in one terminal is ordinary.
          <p key={index} className="min-h-5 whitespace-pre-wrap break-words">
            {index < started - 1 ? line : null}
            {index === started - 1 ? <TypeOut text={line} speedMs={SPEED_MS} /> : null}
            {/*
             * Not yet reached: the text is laid out but invisible, so the row
             * is already its final height and `visibility: hidden` keeps it out
             * of the accessible tree until it is genuinely on screen.
             */}
            {index > started - 1 ? <span className="invisible">{line}</span> : null}
          </p>
        ))}
      </div>
    </div>
  );
}

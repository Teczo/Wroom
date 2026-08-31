import { useEffect, useState } from 'react';

import { TypeOut } from './TypeOut';
import { usePointerTilt } from '../lib/usePointerTilt';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

/**
 * The decorative screen beside the landing hero, and again beside the about
 * page's intro.
 *
 * The lines are `terminalLines` from the published `landing` record and nothing
 * is written here (§2 rule 8). It is decoration, and the page it
 * sits on decides the width below which it is gone — a phone gets the words
 * instead either way (§7.7, docs/DATA_MODEL.md).
 *
 * The bar across its top is three lights and the session name — `terminalTitle`
 * from the same record, so the caption is an edit and a publish like everything
 * else (§2 rule 8). The lights are geometry rather than marks: there is nothing
 * to look up and nothing to correct in a library (§7.3). A record with no title
 * keeps the bar and loses the caption.
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
  title?: string;
  /**
   * How long to hold before the first character, so a panel that is still
   * arriving is settled before anything inside it starts moving. Ignored under
   * reduced motion, where every line is present from the first frame.
   */
  startDelayMs?: number;
  className?: string;
}

export function Terminal({
  lines,
  title = '',
  startDelayMs = 0,
  className = '',
}: TerminalProps) {
  const reduced = usePrefersReducedMotion();

  /*
   * The panel leans a degree and a half towards the pointer and drifts about
   * four pixels with it — the §6 ceiling, and the reason the numbers are stated
   * there rather than felt for. It reads as a screen sitting slightly off the
   * page rather than printed on it, and it exists only on a mouse: the hook
   * attaches nothing to a coarse pointer or under reduced motion.
   */
  const tilt = usePointerTilt<HTMLDivElement>({
    maxRotateDeg: 1.5,
    maxShiftPx: 4,
    settleMs: 500,
  });

  // The copy itself, as one value. The array arrives fresh from the parsed
  // record on every render, so it is the words that have to drive the effects
  // below — depending on the array would restart the type-out on every state
  // change it causes.
  const script = lines.join('\n');

  // How many lines have begun. The last of them is the one being typed;
  // everything before it is finished text and everything after it is a row
  // holding its space. Zero is the hold before the first line, which is what
  // `startDelayMs` buys — every row is already drawn at its final height, so
  // the panel waiting is a panel that is simply empty.
  const first = startDelayMs > 0 ? 0 : 1;
  const [started, setStarted] = useState(reduced ? lines.length : first);

  // Start over when the copy changes — the record arrives after the first
  // render — or land on the finished state at once if the preference is set.
  useEffect(() => {
    setStarted(reduced ? lines.length : first);
  }, [script, reduced, first]);

  useEffect(() => {
    if (reduced || started >= lines.length) return;

    // Before the first line there is only the hold; after it, the wait is the
    // length of the line being typed plus a beat.
    const current = started === 0 ? '' : (lines[started - 1] ?? '');
    const wait =
      started === 0 ? startDelayMs : current.length * SPEED_MS + LINE_PAUSE_MS;

    const id = window.setTimeout(() => setStarted((count) => count + 1), wait);

    return () => window.clearTimeout(id);
  }, [started, script, reduced, startDelayMs]);

  if (lines.length === 0) return null;

  return (
    /*
     * The glow is a token, not a literal: §7.1 admits no hex written outside
     * `index.css`, and this is the same value the lit borders elsewhere use.
     */
    <div
      ref={tilt.ref}
      style={tilt.style}
      className={`overflow-hidden rounded-2xl border border-border sm:rounded-[1.75rem] bg-surface-deep/70 shadow-[0_0_100px_var(--color-accent-glow)] ${className}`}
    >
      {/*
       * The window bar. The lights are three painted circles in the token
       * colours and carry no meaning — `aria-hidden`, because "red, amber,
       * green" read aloud is noise in front of the session below.
       */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5 sm:px-6">
        <span aria-hidden className="flex gap-2">
          <span className="size-3 rounded-full bg-light-red" />
          <span className="size-3 rounded-full bg-light-amber" />
          <span className="size-3 rounded-full bg-light-green" />
        </span>

        {title ? (
          <span className="ml-auto truncate font-mono text-[0.6875rem] text-muted">{title}</span>
        ) : null}
      </div>

      <div className="min-h-56 p-5 font-mono text-xs leading-[1.75] text-accent/70 sm:min-h-64 sm:p-8 lg:p-10">
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

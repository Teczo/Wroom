import { useEffect, useState } from 'react';

import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

/**
 * Types a line of text out one character at a time, for the landing terminal.
 *
 * This is the one piece of motion on the site that a stylesheet cannot switch
 * off, because nothing here is a transition — the text genuinely is not in the
 * document yet. So reduced motion is handled in JavaScript instead: the full
 * string is the first and only state rendered, and the caret does not blink
 * (§7.5 — *disables*, not reduces).
 *
 * The full text is always in the accessible tree, even mid-type. A screen
 * reader announcing a line letter by letter as it grows is worse than useless,
 * so the growing copy is hidden from it and a complete one sits alongside.
 */
export interface TypeOutProps {
  text: string;
  /** Milliseconds per character. */
  speedMs?: number;
  className?: string;
}

export function TypeOut({ text, speedMs = 45, className = '' }: TypeOutProps) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? text.length : 0);

  // Start over when the line changes — or land on the finished state at once if
  // the preference is set or turns on part way through.
  useEffect(() => {
    setShown(reduced ? text.length : 0);
  }, [text, reduced]);

  // One timer per character rather than one interval for the line: it stops on
  // its own at the end, and a change to `text` cancels the pending character
  // instead of racing the reset above.
  useEffect(() => {
    if (reduced || shown >= text.length) return;

    const id = window.setTimeout(() => setShown((current) => current + 1), speedMs);
    return () => window.clearTimeout(id);
  }, [shown, text.length, speedMs, reduced]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, shown)}
        <span
          // A hard blink on a step curve, not a soft pulse: a caret that fades
          // in and out is a glow, and a caret is a square that is either lit or
          // not. It is still slow enough not to flicker (§6).
          className={`ml-0.5 inline-block w-[0.55em] bg-accent align-baseline ${
            reduced ? '' : 'animate-caret-blink'
          }`}
          // A caret drawn as a background needs a height, and `1em` of an empty
          // inline-block is zero — so the height comes from the line, not text.
          style={{ height: '1em' }}
        />
      </span>
    </span>
  );
}

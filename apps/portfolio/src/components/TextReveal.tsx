import { type ReactNode } from 'react';

/**
 * A heading arriving from behind its own baseline.
 *
 * The line is clipped away below, then the clip is opened downwards while the
 * text rises a fraction of its own size into place. Two properties and a
 * quarter of an em of travel — it reads as the words being uncovered rather
 * than as a block of text sliding, which is the difference between a masked
 * reveal and a fade with extra steps.
 *
 * `clip-path`, not `overflow: hidden` on a wrapper. The usual way to mask a line
 * is to put it in a box that hides what leaves, but the box has to be exactly
 * the height of the line — and this heading is set at 0.95 line-height with
 * descenders in it, so a box tight enough to mask is a box that clips the tail
 * of a `g`. A clip path can be inset past the edges of the element instead: the
 * finished state is thirty percent of slack on every side, which is no visible
 * clipping at all, and no wrapper means no layout change.
 *
 * Per line, never per letter. A letter-by-letter reveal on a name is a title
 * sequence, and it puts the one word a visitor is meant to come away with
 * behind a second of animation (§4).
 *
 * Reduced motion is handled by the caller passing `show` as true from the first
 * render, and by the `clip-path: none` in `index.css` — which is the belt to
 * that braces, because a heading clipped to nothing is the one failure mode
 * this file must never have.
 */
export interface TextRevealProps {
  /** False holds the line masked; true plays it. */
  show: boolean;
  children: ReactNode;
  delayMs?: number;
  durationMs?: number;
  className?: string;
}

const HIDDEN = '[clip-path:inset(-30%_-30%_100%_-30%)] translate-y-[0.24em] opacity-0';
const SHOWN = '[clip-path:inset(-30%)] translate-y-0 opacity-100';

export function TextReveal({
  show,
  children,
  delayMs = 0,
  durationMs = 900,
  className = '',
}: TextRevealProps) {
  return (
    <span
      className={`block [transition-property:clip-path,transform,opacity] ease-out-expo ${
        show ? SHOWN : HIDDEN
      } ${className}`}
      style={{
        transitionDuration: `${durationMs}ms`,
        transitionDelay: show ? `${delayMs}ms` : '0ms',
      }}
    >
      {children}
    </span>
  );
}

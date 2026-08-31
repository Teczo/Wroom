import { type ReactNode } from 'react';

import { entering, type EnterVariant } from '../lib/entrance';
import { useInView } from '../lib/useInView';

/**
 * Fades and lifts its children into place the first time they are scrolled to.
 *
 * The movement itself is `entering()` from `lib/entrance.ts`, which is also
 * what plays the hero's load choreography. Sharing it is the point: a scroll
 * reveal and a page entrance that ease differently are two motion languages on
 * one page, and a visitor reads that as a site assembled from parts (§17).
 *
 * A variant, and only for choreography. §9 asks for the same idea in a section
 * to arrive the same way each time and for a section not to arrive exactly like
 * the one above it — a label rises a little, a card rises further, a link
 * arrives from the right. What it is not is licence for a new entrance per
 * component: `EnterVariant` is a closed set of six, and a section picks from it.
 *
 * Reduced motion needs no branch here. `useInView` reports `true` from the very
 * first render in that case, so the finished classes are the only ones ever
 * applied — and the stylesheet has already stripped the transition and the
 * transform besides (§7.5).
 *
 * Do not wrap anything above the fold in this. The hero has its own entrance,
 * which starts when its content does rather than when it is scrolled to.
 */
export interface RevealProps {
  children: ReactNode;
  /**
   * Milliseconds to hold before this one starts, for staggering a row of cards.
   * The stylesheet forces the delay to zero under reduced motion, so a stagger
   * cannot turn into a wait for content that is supposed to be immediate.
   */
  delayMs?: number;
  /** Where it comes from. The default short lift is right for most things. */
  variant?: EnterVariant;
  durationMs?: number;
  className?: string;
}

export function Reveal({
  children,
  delayMs = 0,
  variant = 'up',
  durationMs = 700,
  className = '',
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const enter = entering(inView, variant, delayMs, durationMs);

  return (
    <div ref={ref} style={enter.style} className={`${enter.className} ${className}`}>
      {children}
    </div>
  );
}

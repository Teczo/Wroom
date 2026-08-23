import { type ReactNode } from 'react';

import { useInView } from '../lib/useInView';

/**
 * Fades and lifts its children into place the first time they are scrolled to.
 *
 * One variant, on purpose: a site with four different entrances reads as a site
 * that could not decide. Everything that reveals on the public pages reveals
 * this way.
 *
 * Reduced motion needs no branch here. `useInView` reports `true` from the very
 * first render in that case, so the finished classes are the only ones ever
 * applied — and the stylesheet has already stripped the transition and the
 * transform besides (§7.5).
 *
 * Do not wrap anything above the fold in this. A hero that fades in measures as
 * a hero that arrived late.
 */
export interface RevealProps {
  children: ReactNode;
  /**
   * Milliseconds to hold before this one starts, for staggering a row of cards.
   * The stylesheet forces the delay to zero under reduced motion, so a stagger
   * cannot turn into a wait for content that is supposed to be immediate.
   */
  delayMs?: number;
  className?: string;
}

export function Reveal({ children, delayMs = 0, className = '' }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`transition duration-700 ease-out ${
        inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

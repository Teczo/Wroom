import { useEffect, type CSSProperties, type RefCallback } from 'react';

import { subscribeScroll } from './scrollDriver';
import { useAttachedNode } from './useAttachedNode';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Scroll-linked depth, as one number written to one custom property.
 *
 * The section measures itself and publishes `--section-p` — nought while its
 * top is still at or below the top of the viewport, one once it has travelled
 * its own height past it. Every layer inside then multiplies that number by a
 * distance of its own, in CSS, so the layers move at different rates without
 * JavaScript touching any of them (§18). One property write per frame buys the
 * whole effect however many layers there are.
 *
 * Under reduced motion nothing subscribes and the property is never set, so
 * every layer falls back to the `0` in its own `var()` and sits exactly where
 * the stylesheet puts it. `index.css` strips the transform on top of that —
 * which is the rule that makes this safe at all: a parallax offset may be lost
 * without anything moving out of place, because the offset is zero at rest.
 */
export function useSectionProgress<T extends HTMLElement>(): RefCallback<T> {
  const [element, ref] = useAttachedNode<T>();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !element) return;

    // Rounded to three places and compared before writing: a custom property
    // write invalidates style for the whole subtree, and there is no visible
    // difference between 0.4271 and 0.427.
    let last = -1;

    return subscribeScroll(() => {
      const rect = element.getBoundingClientRect();
      const travel = rect.height || 1;
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1);
      const rounded = Math.round(progress * 1000) / 1000;

      if (rounded === last) return;
      last = rounded;
      element.style.setProperty('--section-p', String(rounded));
    });
  }, [element, reduced]);

  return ref;
}

/**
 * One layer's share of that progress.
 *
 * `distancePx` is where the layer has got to by the time the section has fully
 * left — negative travels up, ahead of the page; positive lags behind it. Keep
 * these small. The effect is meant to read as depth, not as pieces of the hero
 * leaving at different times.
 *
 * `fadeTo` is the opacity the layer reaches at the same point, and is left at
 * one for anything that should stay solid.
 */
export function parallaxStyle(distancePx: number, fadeTo = 1): CSSProperties {
  const style: CSSProperties = {
    transform: `translate3d(0, calc(var(--section-p, 0) * ${distancePx}px), 0)`,
  };

  if (fadeTo < 1) {
    style.opacity = `calc(1 - var(--section-p, 0) * ${(1 - fadeTo).toFixed(3)})`;
  }

  return style;
}

/**
 * The drift on the background grid.
 *
 * The grid is a fixed pseudo-element on `body`, so it does not move with the
 * page at all — which is the flattest a background can be. Sliding it a few
 * dozen pixels against the scroll gives the page a floor to sit above without
 * the grid ever becoming something a visitor notices moving.
 *
 * Written to the document element because `body::before` cannot be reached from
 * React; `index.css` is where it is consumed. The travel is capped so the grid
 * is never displaced far enough to expose its own edge — and it only ever moves
 * up, into the quarter of the element the mask has already faded to nothing.
 */
const GRID_RATE = 0.04;
const GRID_MAX_PX = 44;

export function useGridDrift(): void {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const root = document.documentElement;
    let last = -1;

    const stop = subscribeScroll((scrollY) => {
      const shift = Math.round(Math.min(scrollY * GRID_RATE, GRID_MAX_PX));
      if (shift === last) return;
      last = shift;
      root.style.setProperty('--grid-shift', `${-shift}px`);
    });

    return () => {
      stop();
      root.style.removeProperty('--grid-shift');
    };
  }, [reduced]);
}

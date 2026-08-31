import { useEffect, type CSSProperties, type RefCallback } from 'react';

import { useAttachedNode } from './useAttachedNode';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * A card or a panel leaning very slightly towards the pointer.
 *
 * Two degrees, not fifteen. The whole point is that a visitor should feel the
 * surface respond without being able to say what moved — a card that visibly
 * pivots reads as a game, not as a piece of software (§17).
 *
 * It exists on a mouse and nowhere else. Coarse pointers get no listeners at
 * all: there is no hover on a phone, and a tilt that only fires on the tap
 * before a navigation is motion nobody asked for on the device least able to
 * afford it. Reduced motion likewise gets nothing attached, and `index.css`
 * strips the transform besides.
 *
 * The transform is composed from custom properties rather than written whole,
 * so the pointer handler only ever sets a number: no string building per frame,
 * no React state, no re-render. The transition on the element is what smooths
 * it — the values snap to the pointer and the element takes a moment to catch
 * up, which is what makes a lean feel weighted rather than glued.
 */
export interface PointerTiltOptions {
  /** Maximum lean, in degrees, at the corners. */
  maxRotateDeg?: number;
  /** Maximum sideways drift, in pixels — the terminal's 3–5px of parallax. */
  maxShiftPx?: number;
  /** How far the element rises while the pointer is over it. */
  liftPx?: number;
  /** How long the element takes to reach the pointer's latest position. */
  settleMs?: number;
}

export interface PointerTilt<T extends HTMLElement> {
  ref: RefCallback<T>;
  style: CSSProperties;
}

export function usePointerTilt<T extends HTMLElement = HTMLDivElement>({
  maxRotateDeg = 2,
  maxShiftPx = 0,
  liftPx = 0,
  settleMs = 380,
}: PointerTiltOptions = {}): PointerTilt<T> {
  const [element, ref] = useAttachedNode<T>();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !element) return;
    if (typeof window.matchMedia !== 'function') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let nextX = 0;
    let nextY = 0;

    const apply = () => {
      frame = 0;
      // `nextX`/`nextY` are -1..1 from the centre of the element.
      element.style.setProperty('--tilt-ry', `${(nextX * maxRotateDeg).toFixed(2)}deg`);
      element.style.setProperty('--tilt-rx', `${(-nextY * maxRotateDeg).toFixed(2)}deg`);
      element.style.setProperty('--tilt-x', `${(nextX * maxShiftPx).toFixed(2)}px`);
      element.style.setProperty('--tilt-y', `${(nextY * maxShiftPx - liftPx).toFixed(2)}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      nextX = Math.min(Math.max((event.clientX - rect.left) / rect.width - 0.5, -0.5), 0.5) * 2;
      nextY = Math.min(Math.max((event.clientY - rect.top) / rect.height - 0.5, -0.5), 0.5) * 2;

      // Coalesced to one write per frame: `pointermove` fires far faster than
      // the screen refreshes, and each of these is a style invalidation.
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    const onEnter = () => {
      element.style.willChange = 'transform';
    };

    const onLeave = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      // Removed rather than set to zero, so the element returns to whatever the
      // stylesheet says instead of to a hard-coded rest position.
      for (const name of ['--tilt-rx', '--tilt-ry', '--tilt-x', '--tilt-y']) {
        element.style.removeProperty(name);
      }
      element.style.willChange = '';
    };

    element.addEventListener('pointerenter', onEnter);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerleave', onLeave);
    // A card scrolled out from under a stationary pointer never gets a
    // `pointerleave`, and would stay leaning until it was hovered again.
    element.addEventListener('pointercancel', onLeave);

    return () => {
      element.removeEventListener('pointerenter', onEnter);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerleave', onLeave);
      element.removeEventListener('pointercancel', onLeave);
      onLeave();
    };
  }, [element, reduced, maxRotateDeg, maxShiftPx, liftPx]);

  return {
    ref,
    style: {
      transform:
        'perspective(1100px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg)) ' +
        'translate3d(var(--tilt-x, 0px), var(--tilt-y, 0px), 0)',
      transitionProperty: 'transform, border-color, box-shadow',
      transitionDuration: `${settleMs}ms`,
      transitionTimingFunction: 'var(--ease-out-expo)',
    },
  };
}

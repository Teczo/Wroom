import { useEffect } from 'react';

import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Weighted scrolling for a mouse wheel, and for nothing else.
 *
 * A wheel notch is a jump: the page is in one place and then it is seventy
 * pixels lower, with nothing in between. This interpolates that jump over a few
 * frames so the page arrives rather than cuts, which is the whole of what
 * "smooth scrolling" is worth on a site like this.
 *
 * What it deliberately does not do is take over scrolling. There is no proxy
 * element, no transformed wrapper, no synthetic scroll position — the page is
 * scrolled by `window.scrollTo` and the browser's own scroll position stays the
 * only source of truth. Everything that depends on that keeps working
 * untouched: the scrollbar, the sticky header, `scroll-snap`, anchor links,
 * find-in-page, and the browser scrolling a focused control into view.
 *
 * It withdraws wherever it would be worse than the browser (§16 — if smooth
 * scrolling conflicts with native behaviour or accessibility, usability wins):
 *
 * - Reduced motion: never attached.
 * - Touch and pen: never attached. Native momentum is better than this.
 * - Keyboard, scrollbar drags, `scrollIntoView`: not intercepted at all. The
 *   loop notices the page moved underneath it and re-synchronises instead.
 * - A wheel over a scroller of its own — a code block, a carousel track — is
 *   left alone, so an inner panel still scrolls before the page does.
 * - A mostly-horizontal wheel is left alone, or the tech row and the project
 *   carousel would stop responding to a trackpad swipe.
 * - `Ctrl`/`Cmd` wheel is left alone, because that is the browser's zoom.
 * - While the mobile menu has locked the body, there is nothing to scroll.
 *
 * The result is a page that feels weighted under a wheel and completely
 * ordinary under everything else.
 */

/** Share of the remaining distance covered per 60Hz frame. */
const LERP = 0.14;

/** Below this the page has arrived and the loop stops. */
const ARRIVED_PX = 0.5;

/**
 * How far the page can move without the loop having been the cause. Anything
 * larger is somebody else scrolling — a scrollbar drag, a key, a focus jump —
 * and the target follows them rather than fighting.
 */
const FOREIGN_PX = 2;

/** How many pixels a line and a page of wheel delta are worth. */
const LINE_PX = 16;
const PAGE_RATIO = 0.9;

function wheelPixels(event: WheelEvent): number {
  if (event.deltaMode === 1) return event.deltaY * LINE_PX;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight * PAGE_RATIO;
  return event.deltaY;
}

/**
 * Whether something between the wheel and the page can absorb this scroll.
 *
 * Walks up from the event target looking for an element that both overflows on
 * the Y axis and still has somewhere to go in the direction being asked for.
 * Bounded, because the walk happens on every wheel event and a deep tree is not
 * a reason to do more work than the answer is worth.
 */
function innerScrollerHandlesIt(target: EventTarget | null, deltaY: number): boolean {
  let node = target instanceof Element ? target : null;

  for (let depth = 0; node && depth < 12; depth += 1, node = node.parentElement) {
    if (node === document.body || node === document.documentElement) return false;
    if (!(node instanceof HTMLElement)) continue;

    const room = node.scrollHeight - node.clientHeight;
    if (room <= 1) continue;

    const overflow = getComputedStyle(node).overflowY;
    if (overflow !== 'auto' && overflow !== 'scroll') continue;

    const atTop = node.scrollTop <= 0;
    const atBottom = node.scrollTop >= room - 1;
    if (deltaY < 0 ? !atTop : !atBottom) return true;
  }

  return false;
}

export function useSmoothScroll(): void {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (typeof window.matchMedia !== 'function') return;
    // A wheel is a mouse. A trackpad reports as one too, and benefits equally;
    // a finger does not, and keeps the browser's momentum instead.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let target = window.scrollY;
    let expected = target;
    let frame = 0;

    const limit = () =>
      Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);

    let previous = 0;

    const step = (now: number) => {
      const current = window.scrollY;

      // Somebody else moved the page. Hand it back to them.
      if (Math.abs(current - expected) > FOREIGN_PX) {
        frame = 0;
        return;
      }

      const distance = target - current;
      if (Math.abs(distance) < ARRIVED_PX) {
        frame = 0;
        return;
      }

      // Frame-rate independent, so the weight feels the same on a 60Hz panel
      // and a 120Hz one rather than twice as fast on the second.
      const elapsed = previous ? Math.min(now - previous, 50) : 16.67;
      previous = now;
      const factor = 1 - Math.pow(1 - LERP, elapsed / 16.67);

      window.scrollTo(0, current + distance * factor);
      // Read back rather than assumed: the browser clamps at the ends of the
      // document and rounds to whole device pixels.
      expected = window.scrollY;

      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (frame) return;
      previous = 0;
      frame = requestAnimationFrame(step);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      // The mobile menu locks the body while it is open.
      if (document.body.style.overflow === 'hidden') return;

      const max = limit();
      if (max <= 0) return;
      if (innerScrollerHandlesIt(event.target, event.deltaY)) return;

      // Between gestures the page is wherever the browser left it, which is not
      // necessarily where this loop last aimed.
      if (!frame) {
        target = window.scrollY;
        expected = target;
      }

      const next = Math.min(Math.max(target + wheelPixels(event), 0), max);
      // Already pinned at an end: let the browser have the event so overscroll,
      // pull-to-refresh and scroll chaining behave as they normally would.
      if (next === target) return;

      event.preventDefault();
      target = next;
      start();
    };

    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', onWheel);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);
}

import { useEffect, useState, type RefCallback } from 'react';

import { useAttachedNode } from './useAttachedNode';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * ## Why a reveal has to wait for the page to stop moving
 *
 * A page reached by a link renders in one commit: every query behind it is
 * already in the cache, so the document is its final height before a single
 * observer runs. A page loaded from its own URL is not. Its sections arrive as
 * their requests land — on the landing page that is three commits, and the
 * document goes 760px, 1611px, 1825px inside four hundred milliseconds.
 *
 * A section that mounts during that is not where it is going to end up. The six
 * project cards mount in the second commit, briefly sit inside the viewport
 * because the sections above them have not reached full height yet, and an
 * observer attached at that moment reports them as on screen. They are then
 * pushed a thousand pixels down by the third commit — but a reveal is a one-way
 * door, so they stay revealed, and scrolling to them shows six cards already
 * sitting there. That is the whole of "the scroll animations don't work when I
 * reload", and it is a race with the data, not with the router.
 *
 * So an intersection seen while the document is still resizing is not trusted.
 * It is not discarded either — the element is simply asked again, once the page
 * has stopped moving, at the position it actually settled into.
 */

/** Quiet time with no resize before the layout counts as final. */
const SETTLE_QUIET_MS = 200;

/**
 * The longest a reveal will wait for that quiet. Something that resizes the
 * document forever must not be able to keep every reveal on the page shut, and
 * the failure mode of a reveal is always "content is visible" (see below).
 */
const SETTLE_MAX_MS = 1500;

/*
 * One `ResizeObserver` for the document, shared by every reveal on the page,
 * for the same reason `scrollDriver` keeps one scroll listener: eighteen
 * observers watching one element is eighteen callbacks per layout change to
 * answer a question that has one answer (§18).
 */
const waiting = new Set<() => void>();
let resize: ResizeObserver | null = null;
let quiet = 0;
let cap = 0;

function flush() {
  window.clearTimeout(quiet);
  window.clearTimeout(cap);
  quiet = 0;
  cap = 0;
  resize?.disconnect();
  resize = null;

  // Copied before iterating: a callback re-registering would otherwise mutate
  // the set mid-loop.
  const due = [...waiting];
  waiting.clear();
  for (const notify of due) notify();
}

function restartQuiet() {
  window.clearTimeout(quiet);
  quiet = window.setTimeout(flush, SETTLE_QUIET_MS);
}

/**
 * Call `notify` once the document has stopped changing size.
 *
 * Timers and `ResizeObserver` rather than `requestAnimationFrame`, deliberately:
 * both still fire in a tab that is not being painted, so a reveal observed in a
 * background tab is not left waiting for a frame that never comes.
 */
function whenLayoutSettles(notify: () => void): () => void {
  waiting.add(notify);

  if (waiting.size === 1) {
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(restartQuiet);
      resize.observe(document.body);
    }
    restartQuiet();
    cap = window.setTimeout(flush, SETTLE_MAX_MS);
  }

  return () => waiting.delete(notify);
}

/**
 * The site's one scroll-reveal primitive (§7.5).
 *
 * Attach `ref` to an element; `inView` flips to `true` the first time that
 * element crosses into the viewport and then stays true. The observer stops
 * watching at that point — a reveal is a one-way door, and an observer left
 * running is a callback firing on every scroll for an element whose answer can
 * no longer change.
 *
 * `ref` is a callback ref rather than a ref object, and that matters more than
 * it looks: several callers render nothing at all until their content arrives,
 * and an effect that read `ref.current` would read it before the element
 * existed and never look again. `useAttachedNode` explains the failure in full.
 *
 * Under reduced motion the observer is never created at all: `inView` is true
 * from the first render, so whatever the caller wraps is on screen immediately
 * rather than waiting to be scrolled past. The same fallback covers a browser
 * with no `IntersectionObserver` — the failure mode of a reveal must be
 * "content is visible", never "content is invisible".
 */
export interface UseInViewOptions {
  /**
   * How far into the viewport the element must come before it counts. The
   * default pulls the bottom edge up slightly, so a reveal fires once the
   * element is properly on screen rather than the instant its first pixel is.
   */
  rootMargin?: string;
  /** Fraction of the element that must be visible. */
  threshold?: number;
}

export function useInView<T extends Element = HTMLDivElement>({
  rootMargin = '0px 0px -10% 0px',
  threshold = 0.15,
}: UseInViewOptions = {}): { ref: RefCallback<T>; inView: boolean } {
  const [node, ref] = useAttachedNode<T>();
  const reduced = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    if (!node) return;

    let settled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          // Still assembling: this element is not at its final position yet, so
          // being on screen now means nothing. It gets asked again below.
          if (!settled) continue;

          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);

    const stopWaiting = whenLayoutSettles(() => {
      settled = true;
      // Re-observing delivers a fresh callback for wherever the element
      // actually ended up, which is the reading the first one should have been.
      // An element that landed off screen simply stays observed and reveals on
      // scroll, exactly as it always did.
      observer.unobserve(node);
      observer.observe(node);
    });

    return () => {
      stopWaiting();
      observer.disconnect();
    };
  }, [node, reduced, rootMargin, threshold]);

  return { ref, inView };
}

import { useEffect, useState, type RefCallback } from 'react';

import { useAttachedNode } from './useAttachedNode';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

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

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [node, reduced, rootMargin, threshold]);

  return { ref, inView };
}

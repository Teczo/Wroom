import { useEffect, useState, type RefCallback } from 'react';

import { useAttachedNode } from './useAttachedNode';

/**
 * Whether an element is on screen right now — both ways, unlike `useInView`.
 *
 * `useInView` is a one-way door because a reveal cannot un-happen. Continuous
 * motion is the opposite case: an ambient float on a portrait that has been
 * scrolled past is a compositor animating a layer nobody can see, every frame,
 * for the rest of the visit (§18). This is what lets it stop.
 *
 * With no `IntersectionObserver` the answer is `true`, so the failure mode is
 * an animation that runs rather than one that never starts.
 */
export function useOnScreen<T extends Element = HTMLDivElement>(): {
  ref: RefCallback<T>;
  onScreen: boolean;
} {
  const [node, ref] = useAttachedNode<T>();
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setOnScreen(entry.isIntersecting);
      },
      // A margin, so motion resumes just before the element is scrolled back to
      // rather than starting from a dead stop in view.
      { rootMargin: '15% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref, onScreen };
}

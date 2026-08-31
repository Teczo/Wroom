import { useState, type RefCallback } from 'react';

/**
 * The element a hook is watching, as state rather than as a ref.
 *
 * Every observer on this site — a scroll reveal, a parallax layer, a pointer
 * lean — has to run an effect against a DOM node, and the obvious way to reach
 * that node is `useRef` plus `ref.current` inside the effect. That is wrong
 * here, and wrongly in a way that looks like it works.
 *
 * A ref read inside an effect is read exactly once, when the effect's
 * dependencies last changed. Several components on this site render `null`
 * before they render anything — the hero, the stats band and the CTA row all
 * decide they have nothing to show while the published record is still on its
 * way, and only render their element once it arrives (§7.4). By then the effect
 * has already run, found `null`, and returned. It is never asked again, because
 * nothing it depends on changed, and the observer silently never attaches.
 *
 * A callback ref is called by React when the node is attached and again with
 * `null` when it is detached, so putting it in state makes the node a
 * dependency. The effect then runs when there is something to observe, and
 * re-runs if it is ever replaced.
 *
 * The setter from `useState` is stable for the life of the component, so it is
 * safe to hand straight to `ref=` without memoising and cannot loop.
 */
export function useAttachedNode<T extends Element>(): [T | null, RefCallback<T>] {
  const [node, setNode] = useState<T | null>(null);
  return [node, setNode];
}

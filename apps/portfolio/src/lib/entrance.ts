import { useEffect, useState, type CSSProperties } from 'react';

import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * The site's entrance vocabulary: one flag, one class helper.
 *
 * A reveal (`useInView`) waits to be scrolled to. An entrance does not — it
 * plays once, on the frame after the thing it belongs to mounts, and its whole
 * job is to make a group of elements arrive as one piece of choreography rather
 * than as nine independent fades. That is what the delays are for: every
 * element in a group shares a single trigger, so a stagger is an offset from a
 * common zero instead of a chain of timers that drift apart.
 *
 * Under reduced motion `useEntered` is true from the first render, so the
 * finished classes are the only ones ever applied and no delay is ever waited
 * out — `disables`, not reduces (§7.5). `index.css` strips the transition
 * besides, which is the belt to this braces.
 */

/** How long to wait for the two frames before giving up and showing anyway. */
const FALLBACK_MS = 250;

/**
 * True from the frame after mount, so a transition has a start state to leave.
 *
 * Two frames, not one. Setting the state in the same frame the element is first
 * painted lets the browser collapse both style computations into one, and a
 * transition with no intermediate frame is a jump.
 *
 * `ready` is for content that arrives after mount — the hero cannot begin until
 * the published record it renders exists, and beginning without it would play
 * the choreography to an empty column and leave the words to appear afterwards.
 */
export function useEntered(ready = true): boolean {
  const reduced = usePrefersReducedMotion();
  const [entered, setEntered] = useState(reduced);

  useEffect(() => {
    if (!ready) return;

    if (reduced) {
      setEntered(true);
      return;
    }

    let second = 0;

    /*
     * The safety net, and it is not theoretical.
     *
     * `requestAnimationFrame` does not fire in a tab that is not being
     * painted — a background tab, a minimised window, a link opened with the
     * middle button. Every element waiting on this flag is at `opacity: 0`
     * until it flips, so an entrance that waits on rAF alone is a page that
     * stays blank in a background tab and only assembles itself once it is
     * looked at. That is *mostly* fine, and precisely the wrong thing to bet
     * the whole hero on.
     *
     * So a timer runs alongside, set long enough that it can never win a race
     * it is not meant to win: two frames take about thirty milliseconds on a
     * tab that is being painted, so on screen the frames always get there
     * first and the choreography plays. Off screen the frames never come, the
     * timer does — clamped by the browser to about a second, which is fine for
     * a page nobody is looking at — and the content is simply there when the
     * tab is opened. Whichever arrives first, this only moves one way.
     */
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    const fallback = window.setTimeout(() => setEntered(true), FALLBACK_MS);

    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
      window.clearTimeout(fallback);
    };
  }, [ready, reduced]);

  return entered;
}

/**
 * Where an element comes from.
 *
 * Deliberately few. A page with one entrance per element reads as a page that
 * could not decide, so these are five directions and a plain fade, and a
 * section picks one rather than inventing a sixth (§17).
 *
 * Every one of them is transform, opacity and blur — nothing that costs layout
 * (§18). The blur is what separates this from a fade: a thing that sharpens as
 * it settles reads as a thing coming into focus, and a thing that only changes
 * opacity reads as a thing being switched on.
 */
export type EnterVariant = 'up' | 'rise' | 'right' | 'left' | 'fade' | 'lift';

const FROM: Record<EnterVariant, string> = {
  /** The default: a short lift out of a soft blur. Labels, copy, list rows. */
  up: 'translate-y-4 opacity-0 blur-[6px]',
  /** Further, for a card or a panel that should feel like it has travelled. */
  rise: 'translate-y-8 opacity-0 blur-[8px]',
  /** From the right: the terminal rail, a `view all` link, a footer CTA. */
  right: 'translate-x-10 opacity-0 blur-[6px]',
  left: '-translate-x-10 opacity-0 blur-[6px]',
  /** No movement at all, for something already in the right place. */
  fade: 'opacity-0 blur-[4px]',
  /** Settles down onto the page rather than up off it — the hero portrait. */
  lift: 'translate-y-8 scale-[0.96] opacity-0 blur-[6px]',
};

/**
 * The finished state. No blur class on purpose: `filter: none` is the identity
 * every browser interpolates a `blur()` against, and leaving the property off
 * once the transition is done drops the compositing layer with it.
 */
const TO = 'translate-x-0 translate-y-0 scale-100 opacity-100';

export interface EnteringProps {
  className: string;
  style: CSSProperties;
}

/**
 * Class names and timing for one element of an entrance.
 *
 * Spread onto the element itself rather than wrapping it in anything, because a
 * wrapper is a layout change — half of these elements are grid items with
 * explicit placement, and a div around one of those puts it in the wrong
 * column.
 *
 * The delay only applies on the way in. If `entered` ever goes back to false —
 * a route swap, a record arriving late — the element returns to its start
 * position immediately rather than after the stagger it was given.
 */
export function entering(
  entered: boolean,
  variant: EnterVariant = 'up',
  delayMs = 0,
  durationMs = 700,
): EnteringProps {
  return {
    className: `transition-[opacity,transform,filter] ease-out-expo ${
      entered ? TO : FROM[variant]
    }`,
    style: {
      transitionDuration: `${durationMs}ms`,
      transitionDelay: entered ? `${delayMs}ms` : '0ms',
    },
  };
}

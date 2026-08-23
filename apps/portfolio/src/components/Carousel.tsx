import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

/**
 * A horizontally snapping row of slides. No carousel library (§7.5).
 *
 * The whole mechanism is CSS: the track is `overflow-x-auto` with
 * `scroll-snap-type: x mandatory`, and every slide carries
 * `scroll-snap-align: start`. On a phone that is the entire feature — the
 * finger does the scrolling and the browser does the snapping, which is why
 * the arrows are hidden below `md` (§7.7).
 *
 * JavaScript adds three things a mouse needs and a finger does not: two arrow
 * buttons that call `scrollBy`, dots that say where you are and jump you
 * somewhere else, and the disabled state at either end so an arrow that cannot
 * move never looks like it could.
 *
 * Under reduced motion the arrows and dots still work — they simply jump
 * instead of gliding. `behavior: 'smooth'` passed in JavaScript overrides the
 * stylesheet's `scroll-behavior`, so this is one of the few places that has to
 * ask the preference itself rather than leaving it to `index.css`.
 */
export interface CarouselProps {
  /** Names the region for screen readers, e.g. "Featured projects". */
  label: string;
  /** One node per slide. Each is wrapped in its own snap-aligned list item. */
  children: ReactNode;
  /**
   * Width of a single slide. The default is one full viewport-width card on a
   * phone (§7.7) widening to a fixed card from `md` up, where several fit.
   */
  slideClassName?: string;
  className?: string;
}

/** Chevrons, drawn inline. Chrome, not a mark from the library (§7.3). */
function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

const arrowClass =
  'hidden size-11 items-center justify-center rounded-full border border-border bg-surface ' +
  'text-fg transition-colors hover:bg-surface-hover disabled:pointer-events-none ' +
  'disabled:opacity-40 md:inline-flex';

export function Carousel({
  label,
  children,
  slideClassName = 'w-full md:w-96',
  className = '',
}: CarouselProps) {
  const trackRef = useRef<HTMLUListElement | null>(null);
  const reduced = usePrefersReducedMotion();

  const slides = Children.toArray(children);
  const count = slides.length;

  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(count <= 1);

  /**
   * Reads where the track currently sits. The 1px of slack matters: fractional
   * layout means `scrollLeft` rarely lands exactly on zero or exactly on the
   * maximum, and without it the arrow at the end never disables.
   */
  const readPosition = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const { scrollLeft, scrollWidth, clientWidth } = track;
    const elements = Array.from(track.children) as HTMLElement[];

    // Everything already fits: there is nowhere to go in either direction, so
    // both arrows are dead and the first slide is still the one you are on.
    const scrollable = scrollWidth - clientWidth > 1;
    const end = scrollable && scrollLeft >= scrollWidth - clientWidth - 1;

    setAtStart(!scrollable || scrollLeft <= 1);
    setAtEnd(!scrollable || end);

    // At the far right the track has run out of room before the last slide can
    // reach the left edge — several fit at desktop width — so "nearest to the
    // left edge" would name the second-to-last slide and the final dot could
    // never light up. Scrolled to the end means the end.
    if (end) {
      setActive(Math.max(elements.length - 1, 0));
      return;
    }

    let nearest = 0;
    let shortest = Number.POSITIVE_INFINITY;
    for (const [index, slide] of elements.entries()) {
      const distance = Math.abs(slide.offsetLeft - scrollLeft);
      if (distance < shortest) {
        shortest = distance;
        nearest = index;
      }
    }
    setActive(nearest);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Scroll fires continuously during a swipe; coalescing to one read per
    // frame keeps a finger drag from doing layout work per event.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        readPosition();
      });
    };

    readPosition();
    track.addEventListener('scroll', onScroll, { passive: true });

    // A resize changes how many slides fit, which changes both end states.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll);
    observer?.observe(track);

    return () => {
      track.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [readPosition, count]);

  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';

  /** One slide plus one gap, measured rather than assumed. */
  const stride = (track: HTMLUListElement): number => {
    const [first, second] = Array.from(track.children) as HTMLElement[];
    if (first && second) return second.offsetLeft - first.offsetLeft;
    return track.clientWidth;
  };

  const nudge = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * stride(track), behavior });
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior });
  };

  if (count === 0) return null;

  return (
    <div className={className}>
      <ul
        ref={trackRef}
        // `relative` is load-bearing: `offsetLeft` on a slide is measured from
        // its offset parent, and the arithmetic above only holds if that parent
        // is the track itself.
        // The scrollbar is hidden because the arrows and dots are the
        // affordance; the track keeps `tabIndex` so it stays keyboard-scrollable.
        className="relative flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={label}
        role="group"
        tabIndex={0}
      >
        {slides.map((slide, index) => (
          <li key={index} className={`shrink-0 snap-start ${slideClassName}`}>
            {slide}
          </li>
        ))}
      </ul>

      {count > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            className={arrowClass}
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label="Previous"
          >
            <Chevron direction="left" />
          </button>

          <div className="flex items-center gap-1">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Go to slide ${index + 1} of ${count}`}
                aria-current={index === active}
                // 24px of tap target around a 8px dot. Eight of these have to
                // fit across a 390px phone, which rules out a 44px target here.
                className="flex size-6 items-center justify-center"
              >
                <span
                  aria-hidden
                  className={`size-2 rounded-full transition-colors ${
                    index === active ? 'bg-accent' : 'bg-border'
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            className={arrowClass}
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Next"
          >
            <Chevron direction="right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

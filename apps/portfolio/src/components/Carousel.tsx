import {
  Children,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

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
 * When every slide already fits — two case study cards in a column wide enough
 * for both — there is nothing to scroll, and the controls are not rendered at
 * all rather than rendered dead. Two greyed-out arrows under a row that is
 * plainly complete are an invitation to press something that does nothing.
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
  /**
   * Where the arrows sit from `md` up. `below` puts them either side of the
   * dots under the track; `side` lifts them onto the ends of the track itself,
   * which is what the landing row is drawn as.
   *
   * It changes nothing on a phone: the arrows are hidden either way and the
   * dots do the telling (§7.7).
   */
  controls?: 'below' | 'side';
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
  'text-fg [transition-property:color,background-color,border-color,box-shadow,transform] ' +
  'duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-border-strong ' +
  'hover:bg-surface-hover hover:text-accent hover:shadow-[0_8px_24px_var(--color-accent-glow)] ' +
  'active:translate-y-0 active:scale-95 active:duration-100 ' +
  'disabled:pointer-events-none disabled:opacity-40 md:inline-flex';

/** How far a mouse has to travel before a press counts as a drag, not a click. */
const DRAG_THRESHOLD_PX = 6;

export function Carousel({
  label,
  children,
  slideClassName = 'w-full md:w-96',
  controls = 'below',
  className = '',
}: CarouselProps) {
  const trackRef = useRef<HTMLUListElement | null>(null);
  const reduced = usePrefersReducedMotion();

  /** The mouse drag in progress, if any. A ref because no render depends on it. */
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);

  const slides = Children.toArray(children);
  const count = slides.length;

  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(count <= 1);
  const [scrollable, setScrollable] = useState(false);

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
    // the controls do not appear and the first slide is still the one you are on.
    const canScroll = scrollWidth - clientWidth > 1;
    const end = canScroll && scrollLeft >= scrollWidth - clientWidth - 1;

    setScrollable(canScroll);
    setAtStart(!canScroll || scrollLeft <= 1);
    setAtEnd(!canScroll || end);

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

  // Layout, not an effect: the first read decides whether the control row
  // exists, and doing it after the paint would show the arrows for a frame on
  // a row that turns out to need none.
  useLayoutEffect(() => {
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

  /*
   * The arrow keys step a whole slide rather than the handful of pixels a
   * focused scroll container moves by default, so the keyboard reaches the same
   * positions the arrows and the dots do. Home and End go to the ends.
   *
   * Only the keys that are handled are taken; everything else — Tab, Page Up,
   * the space bar — is left to the browser.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const handled: Record<string, () => void> = {
      ArrowLeft: () => nudge(-1),
      ArrowRight: () => nudge(1),
      Home: () => goTo(0),
      End: () => goTo(count - 1),
    };

    const action = handled[event.key];
    if (!action) return;

    event.preventDefault();
    action();
  };

  /*
   * Dragging the row with a mouse.
   *
   * A finger already does this — the track is a native scroller — and a mouse
   * has the arrows. This is for the people who try to throw the row anyway, and
   * it is written to be invisible when they do not: nothing happens until the
   * pointer has travelled six pixels, so an ordinary click on a card is still
   * an ordinary click.
   *
   * Snapping is switched off for the duration and restored on release, which is
   * what makes the row follow the pointer exactly and then settle onto a slide
   * when let go. Leaving `mandatory` on would have the browser pulling the track
   * back to the nearest slide during the drag.
   *
   * Once it *is* a drag, the click that the browser sends after the release is
   * swallowed — the cards are links, and letting go of a drag over one must not
   * navigate.
   */
  const onPointerDown = (event: ReactPointerEvent<HTMLUListElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const track = trackRef.current;
    if (!track || !scrollable) return;

    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: track.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLUListElement>) => {
    const state = drag.current;
    const track = trackRef.current;
    if (!state || !track || event.pointerId !== state.pointerId) return;

    const travelled = event.clientX - state.startX;
    if (!state.moved) {
      if (Math.abs(travelled) < DRAG_THRESHOLD_PX) return;
      state.moved = true;
      track.style.scrollSnapType = 'none';
      track.setPointerCapture(state.pointerId);
    }

    track.scrollLeft = state.startScroll - travelled;
  };

  const endDrag = (event: ReactPointerEvent<HTMLUListElement>) => {
    const state = drag.current;
    const track = trackRef.current;
    if (!state || !track || event.pointerId !== state.pointerId) return;

    drag.current = null;

    if (!state.moved) return;

    track.style.removeProperty('scroll-snap-type');
    if (track.hasPointerCapture(state.pointerId)) {
      track.releasePointerCapture(state.pointerId);
    }

    const swallow = (click: MouseEvent) => {
      click.preventDefault();
      click.stopPropagation();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    // If no click follows — the release landed on the track itself rather than
    // on a card — the listener would sit there waiting for the next one.
    window.setTimeout(() => window.removeEventListener('click', swallow, true), 0);
  };

  if (count === 0) return null;

  const showControls = count > 1 && scrollable;

  const arrow = (direction: 'left' | 'right') => (
    <button
      type="button"
      className={arrowClass}
      onClick={() => nudge(direction === 'left' ? -1 : 1)}
      disabled={direction === 'left' ? atStart : atEnd}
      aria-label={direction === 'left' ? 'Previous' : 'Next'}
    >
      <Chevron direction={direction} />
    </button>
  );

  const dots = (
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
  );

  return (
    <div className={className}>
      {/* `relative` so the side arrows have the track to sit on. */}
      <div className="relative">
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
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {slides.map((slide, index) => (
            <li key={index} className={`shrink-0 snap-start ${slideClassName}`}>
              {slide}
            </li>
          ))}
        </ul>

        {/*
         * Side placement: the arrows straddle the ends of the track, centred by
         * a full-height flex row rather than a translate — `index.css` strips
         * every transform under reduced motion, so a transform may never be
         * what holds something in position (§7.5).
         *
         * The row itself takes no pointer events, or it would swallow every
         * click landing on the cards behind it.
         */}
        {controls === 'side' && showControls ? (
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-between md:flex">
            <span className="pointer-events-auto -ml-3">{arrow('left')}</span>
            <span className="pointer-events-auto -mr-3">{arrow('right')}</span>
          </div>
        ) : null}
      </div>

      {showControls ? (
        controls === 'side' ? (
          // The dots are the phone's affordance, and on a wide screen the
          // arrows on the track have already said the row moves.
          <div className="mt-5 flex justify-center md:hidden">{dots}</div>
        ) : (
          <div className="mt-5 flex items-center justify-center gap-4">
            {arrow('left')}
            {dots}
            {arrow('right')}
          </div>
        )
      ) : null}
    </div>
  );
}

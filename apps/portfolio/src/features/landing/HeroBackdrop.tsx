import { useEffect, useState } from 'react';

import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';
import type { LandingData } from './landingData';

/**
 * The scene behind the landing hero, from `lg` up.
 *
 * It is the published record's `heroBackground` and nothing else — a still or a
 * looping clip, whichever was uploaded and published (§2 rule 8). Nothing
 * published and there is no backdrop, and the hero falls back to the portrait
 * column it had before, rather than showing an empty black band (§7.4).
 *
 * ## Why it is not in the hero section
 *
 * The plate runs behind the header pill above the hero and behind the band of
 * counts below it, which is how the reference draws it: one room, with the page
 * laid over it. So it is mounted by the page around both, and reaches up past
 * the top of the hero by `--hero-backdrop-rise` — the height of the sticky
 * header band, named once in `index.css` rather than guessed at here.
 *
 * ## Desktop only, in JavaScript rather than in CSS
 *
 * `hidden lg:block` would hide it and still download it. A browser fetches an
 * `<img>` inside a `display: none` box, and a `<video>` brings its poster and
 * whatever `preload` asks for with it — which on a phone is megabytes for
 * something §7.7 says that phone never shows. So the width is asked in
 * JavaScript and the element is not in the document below `lg` at all.
 *
 * The class is kept as well. The query answers `false` for one frame on a slow
 * hydrate and on a browser without `matchMedia`, and the two together mean the
 * worst case is a fetch nobody sees rather than a plate drawn across a phone.
 *
 * ## Motion
 *
 * A clip plays muted, inline and on a loop, and it is decoration: it carries no
 * controls and answers to nothing on the page.
 *
 * Under `prefers-reduced-motion: reduce` it does not play at all (§7.5). The
 * poster is shown as a still image instead, and a clip published without one
 * falls back to the video element with autoplay off, which paints its first
 * frame and then holds it.
 */

/** Matches Tailwind's `lg`, which is where §7.7 puts the desktop hero. */
const DESKTOP_QUERY = '(min-width: 1024px)';

function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const list = window.matchMedia(DESKTOP_QUERY);
    setDesktop(list.matches);

    const onChange = (event: MediaQueryListEvent) => setDesktop(event.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);

  return desktop;
}

export function HeroBackdrop({ background }: { background: LandingData['heroBackground'] }) {
  const desktop = useDesktop();
  const reduced = usePrefersReducedMotion();

  if (background === null || !desktop) return null;

  const poster = background.poster;
  const isVideo = background.kind === 'video';
  const still = isVideo ? poster : background;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 hidden overflow-hidden lg:block"
      style={{ top: 'calc(var(--hero-backdrop-rise) * -1)' }}
    >
      {isVideo && !reduced ? (
        <video
          // Every one of these is load-bearing. Muted is what browsers require
          // before they will start a video on their own; `playsInline` is what
          // stops iOS taking it full screen; and a decorative loop must never
          // offer controls, because a control implies something worth watching.
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster?.url ?? undefined}
          src={background.url}
          className="size-full object-cover object-center"
        />
      ) : null}

      {isVideo && reduced ? (
        poster ? (
          <img
            src={poster.variants?.hero ?? poster.url}
            alt={poster.alt}
            className="size-full object-cover object-center"
          />
        ) : (
          // No still was published, so the clip itself is asked to hold its
          // first frame: no autoplay, no loop, nothing moves.
          <video
            muted
            playsInline
            preload="metadata"
            src={background.url}
            className="size-full object-cover object-center"
          />
        )
      ) : null}

      {!isVideo && still ? (
        <img
          src={still.variants?.hero ?? still.url}
          alt={still.alt}
          className="size-full object-cover object-center"
        />
      ) : null}

      {/*
       * Three scrims, and each is doing one job.
       *
       * The first darkens the whole plate a little, so the accent on the page
       * still reads as the brightest thing in the room. The second pulls the
       * canvas across the left, which is the half the words are set over — the
       * hero has to stay legible whatever picture is published behind it, and
       * that cannot depend on the picture happening to be dark there. The third
       * takes the foot of the image down into the page, so the plate ends in a
       * fade rather than in a straight line across the screen. It is kept short
       * — the band of counts stands on the picture in the reference, and a
       * deeper fade puts that band on bare canvas instead.
       */}
      <div aria-hidden className="absolute inset-0 bg-canvas/20" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-canvas/80 via-canvas/30 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-canvas"
      />
    </div>
  );
}

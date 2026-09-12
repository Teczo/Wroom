import type { SiteContentAchievement } from '@wroom/shared';
import { useEffect, useState } from 'react';

import { Carousel } from '../../components/Carousel';
import { Reveal } from '../../components/Reveal';
import { SectionHeading } from '../../components/SectionHeading';
import { TextReveal } from '../../components/TextReveal';
import { entering } from '../../lib/entrance';
import { useInView } from '../../lib/useInView';
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';

/**
 * The achievements row, between the hero and the work.
 *
 * Pictures on the left, the words for whichever one is showing on the right.
 * Advancing the pictures — an arrow, a dot, or a finger on the track — changes
 * the words beside them.
 *
 * Every part of it is published content (§2 rule 8). The heading is
 * `achievementsTitle` and the rows are `achievementItems`, both written into the
 * landing snapshot at publish. There is no copy in this file to fall back on,
 * which is why an empty heading takes the whole section off the page rather
 * than leaving a default one behind.
 *
 * ## Nothing to say, nothing drawn
 *
 * No rows, or no heading, and the section does not render — heading included
 * (§7.4). A visitor is not waiting for this to arrive; it is simply not part of
 * this page yet, and an empty heading over an empty frame says less than
 * nothing.
 *
 * ## Why the words are not inside the track
 *
 * The obvious build is one slide per achievement carrying its own picture and
 * its own paragraph. It is also the wrong one at desktop width: the design puts
 * the words in a fixed column beside the pictures, and a slide holding both
 * would scroll the words sideways out of that column. So the pictures are the
 * only thing that moves, and the column beside them is told which one is up.
 *
 * That is what `Carousel`'s `onActiveChange` is for, and it is why the pictures
 * use the shared carousel rather than a second one written here: §7.5 admits
 * one carousel mechanism — CSS scroll-snap with `scrollBy` arrows — and a
 * finger on the track has to move the words as surely as an arrow does.
 */

/**
 * How long the words take to leave before the next ones arrive.
 *
 * Short on purpose. This is a fade-out and a fade-in in series rather than a
 * cross-fade — two paragraphs in one column at once is either two lots of text
 * on top of each other or a column kept as tall as the longer of them — so all
 * of this is dead air, and dead air reads as lag. Long enough to see the words
 * go, short enough not to wait for them.
 */
const FADE_MS = 180;

export function Achievements({ title, items }: { title: string; items: SiteContentAchievement[] }) {
  const { ref, inView } = useInView<HTMLElement>();
  const reduced = usePrefersReducedMotion();

  /** Which picture the track is on. */
  const [index, setIndex] = useState(0);
  /** Which one the words are showing — behind `index` while they are leaving. */
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(true);

  /*
   * The swap, held until the old words have gone.
   *
   * Under reduced motion nothing is held: the words change on the same frame
   * the picture does, because §7.5 says disabled, not shortened. The stylesheet
   * has already stripped the transition, so a timer here would be a wait with
   * nothing happening during it — which is worse than the motion it replaces.
   */
  useEffect(() => {
    if (index === shown) return;

    if (reduced) {
      setShown(index);
      setVisible(true);
      return;
    }

    setVisible(false);
    const id = window.setTimeout(() => {
      setShown(index);
      setVisible(true);
    }, FADE_MS);

    return () => window.clearTimeout(id);
  }, [index, shown, reduced]);

  // A row with neither a name nor a paragraph is a draft row, not an
  // achievement. Its picture alone says nothing a visitor can read.
  const rows = items.filter((item) => item.title !== '' || item.body !== '');

  // Both halves have to be there. The heading is content like everything else,
  // so a list with no heading is as unpublished as a heading with no list.
  if (title === '' || rows.length === 0) return null;

  /*
   * Falling back to the first row rather than clamping, exactly as the project
   * hero viewer does: a snapshot republished with fewer achievements while the
   * page is open leaves the index past the end, and the first row is a better
   * answer than an empty column.
   */
  const active = rows[shown] ?? rows[0];
  if (!active) return null;

  const wordsEnter = entering(visible, 'up', 0, 420);

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-5 pb-20">
      <SectionHeading eyebrow="Milestones" />

      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
        <TextReveal show={inView} delayMs={90} durationMs={850}>
          {title}
        </TextReveal>
      </h2>

      {/*
       * One column on a phone, two from `lg` up. The pictures come first in the
       * source either way, so the stack a phone gets is picture then words with
       * no ordering classes to keep in step (§7.7).
       */}
      <Reveal className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <Carousel
          label={title}
          onActiveChange={setIndex}
          /*
           * One picture per viewport at every width. This track is half a row
           * rather than a shelf of cards, and a second picture peeking in from
           * the right would be a picture whose words are not on screen.
           */
          slideClassName="w-full"
          controls="side"
        >
          {rows.map((row, position) =>
            row.image ? (
              <img
                key={position}
                src={row.image.variants?.card ?? row.image.url}
                alt={row.image.alt}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-2xl border border-border object-cover"
              />
            ) : (
              /*
               * A row published before its picture was uploaded. The frame is
               * kept so the track still has a slide to snap to and the words
               * still have something to sit beside — dropping the slide would
               * renumber every dot after it.
               */
              <div
                key={position}
                aria-hidden
                className="aspect-[4/3] w-full rounded-2xl border border-border bg-surface-deep"
              />
            ),
          )}
        </Carousel>

        {/*
         * The words. One block that changes what it says rather than one block
         * per row: the column is a fixed place in the layout, and the text
         * inside it is the only thing that moves.
         */}
        <div style={wordsEnter.style} className={wordsEnter.className}>
          {active.title ? (
            <h3 className="font-heading text-2xl font-medium tracking-tight text-fg sm:text-3xl">
              {active.title}
            </h3>
          ) : null}

          {active.body ? (
            <p className="mt-4 max-w-prose leading-relaxed text-muted">{active.body}</p>
          ) : null}

          {/*
           * Where you are in the list, counted rather than written. The dots
           * under the pictures belong to the pictures; this belongs to the
           * words, and it is a number rather than copy, so it is the one thing
           * here that does not come from the record.
           */}
          {rows.length > 1 ? (
            <p className="mt-6 font-heading text-xs uppercase tracking-[0.18em] text-muted">
              {shown + 1} / {rows.length}
            </p>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}

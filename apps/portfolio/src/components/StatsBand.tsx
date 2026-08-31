import type { SiteContentMark } from '@wroom/shared';

import { Mark, findMark } from './Mark';
import { entering } from '../lib/entrance';
import { useCountUp } from '../lib/useCountUp';
import { useInView } from '../lib/useInView';

/**
 * The band of counts, under the landing hero and again on the about page.
 *
 * Every row is `stats` from a published content record — the glyph, the number
 * and what it counts (§2 rule 8). Nothing here is measured: Wroom counts no
 * clients and times no career, so these say what was written until somebody
 * writes something else.
 *
 * It takes the rows and the marks rather than a whole record, because two pages
 * with the same band should not be two bands that drift apart.
 *
 * A row whose `mediaKey` resolved to nothing — no record, no markup, or a mark
 * whose usage was never approved — keeps its number and loses its glyph, rather
 * than leaving a blank square in the row.
 *
 * No rows and the band does not exist, heading and all (§7.4).
 *
 * At 390px it is two to a row rather than four; the numbers stay large enough
 * to be the thing you see, which a four-across row at that width cannot manage.
 *
 * The rules between the cells are inset rather than edge to edge, which is how
 * the reference draws them: a short line floating between two counts instead of
 * a grid dividing the panel into boxes.
 *
 * ## What moves
 *
 * The panel fades in without moving and the counts arrive into it one after
 * another, then each number counts up from nought to what was written. The
 * order matters: the band is the page's credibility claim, and a figure that
 * lands rather than simply being present is a figure a visitor reads (§8).
 *
 * It happens once. `useInView` is a one-way door, so scrolling back up finds
 * the numbers where they were left rather than re-running the claim.
 */
export interface StatRow {
  mediaKey: string;
  value: string;
  label: string;
}

/** Held between one count and the next. */
const STEP_MS = 90;

function StatCell({
  stat,
  mark,
  inView,
  index,
}: {
  stat: StatRow;
  mark: SiteContentMark | null;
  inView: boolean;
  index: number;
}) {
  const shown = useCountUp(stat.value, inView);
  const enter = entering(inView, 'up', 120 + index * STEP_MS, 620);

  return (
    /*
     * Each cell draws the rule on its own left edge, inset from the panel's top
     * and bottom, and the first cell of each row hides it — which is two counts
     * per row on a phone and four from `sm` up, so the arithmetic changes with
     * the grid.
     *
     * `inset-y-5` rather than a half-height offset and a translate: `index.css`
     * strips every transform under reduced motion, `::before` included, so a
     * translated rule would jump to the top of the cell for exactly the people
     * least likely to forgive it (§7.5). The hover lift below is a transform
     * and is therefore allowed to be lost — it is never the only signal, the
     * ring around the glyph brightens with it.
     */
    <div
      style={enter.style}
      className={`group relative px-5 py-6 before:absolute before:inset-y-5 before:left-0 before:w-px before:bg-border [&:nth-child(2n+1)]:before:hidden sm:[&:nth-child(2n+1)]:before:block sm:[&:nth-child(4n+1)]:before:hidden ${enter.className}`}
    >
      {/*
       * The hover lift is on the contents rather than on the cell, and looks
       * identical because the cell has no box of its own — what a visitor sees
       * lift is the ring, the number and the label. Keeping it off the cell is
       * what lets the entrance own that element's transform, so a three-pixel
       * hover does not inherit the six-hundred-millisecond timing of an
       * arrival.
       */}
      <div className="flex items-center gap-4 transition-transform duration-300 ease-out-expo group-hover:-translate-y-[3px]">
        {mark ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent [transition-property:border-color,box-shadow] duration-500 ease-out-expo group-hover:border-border-strong group-hover:shadow-[0_0_20px_var(--color-accent-glow)]">
            <Mark mark={mark} className="size-5" />
          </span>
        ) : null}

        <div className="min-w-0">
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span className="block font-heading text-2xl font-bold text-fg sm:text-3xl">
              {shown}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-muted">{stat.label}</span>
          </dd>
        </div>
      </div>
    </div>
  );
}

export function StatsBand({
  stats: rows,
  marks,
  className = 'mx-auto max-w-6xl px-5 pb-14 sm:pb-20',
}: {
  stats: readonly StatRow[];
  marks: SiteContentMark[];
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDListElement>();
  const stats = rows.filter((stat) => stat.value !== '' && stat.label !== '');

  // The panel arrives without moving, so the counts inside it are the only
  // thing travelling. Two things moving at once here would read as the band
  // sliding rather than as the numbers landing.
  const panel = entering(inView, 'fade', 0, 600);

  if (stats.length === 0) return null;

  return (
    <section className={className}>
      <dl
        ref={ref}
        style={panel.style}
        className={`grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface-deep transition-colors sm:grid-cols-4 ${panel.className}`}
      >
        {stats.map((stat, index) => (
          <StatCell
            key={`${stat.value}-${stat.label}`}
            stat={stat}
            mark={findMark(marks, stat.mediaKey)}
            inView={inView}
            index={index}
          />
        ))}
      </dl>
    </section>
  );
}

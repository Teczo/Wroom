import { Mark, findMark } from '../../components/Mark';
import { Reveal } from '../../components/Reveal';
import type { LandingData } from './landingData';

/**
 * The band of counts under the hero.
 *
 * Every row is `stats` from the published `landing` record — the glyph, the
 * number and what it counts (§2 rule 8). Nothing here is measured: Wroom counts
 * no clients and times no career, so these say what was written until somebody
 * writes something else.
 *
 * A row whose `mediaKey` resolved to nothing — no record, no markup, or a mark
 * whose usage was never approved — keeps its number and loses its glyph, rather
 * than leaving a blank square in the row.
 *
 * No rows and the band does not exist, heading and all (§7.4).
 *
 * At 390px it is two to a row rather than four; the numbers stay large enough
 * to be the thing you see, which a four-across row at that width cannot manage.
 */
export function Stats({ data }: { data: LandingData }) {
  const stats = data.stats.filter((stat) => stat.value !== '' && stat.label !== '');

  if (stats.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-14 sm:pb-20">
      <Reveal>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {stats.map((stat) => {
            const mark = findMark(data.marks, stat.mediaKey);

            return (
              /*
               * The hairlines between the cells are the grid's own gap showing
               * the container colour through, so the row divides itself however
               * many cells it has and at whichever width it wraps.
               */
              <div
                key={`${stat.value}-${stat.label}`}
                className="flex items-center gap-4 bg-surface-deep px-5 py-6"
              >
                {mark ? (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent">
                    <Mark mark={mark} className="size-5" />
                  </span>
                ) : null}

                <div className="min-w-0">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-heading text-2xl font-bold text-fg sm:text-3xl">
                      {stat.value}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">{stat.label}</span>
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </Reveal>
    </section>
  );
}

import { Mark, findMark } from '../../components/Mark';
import { panelClass } from '../../components/Panel';
import { Reveal } from '../../components/Reveal';
import type { AboutData } from '../content/pageData';

/**
 * The two blocks under the counts: what drives the work, and how it got here.
 *
 * They share a row at `lg` because the reference sets them side by side, and
 * they are one component because that row is the only thing they have in
 * common — either one alone still fills the width, and both empty and the row
 * does not exist (§7.4).
 *
 * Their headings are `driversLabel` and `journeyLabel` from the published
 * record. A block with entries and no label renders the entries without a
 * heading rather than one written into this file (§2 rule 8).
 */

const headingClass =
  'font-heading text-sm font-semibold uppercase tracking-[0.14em] text-accent';

export function AboutLower({ data }: { data: AboutData }) {
  const { driversLabel, drivers, journeyLabel, journey } = data;

  const hasDrivers = drivers.length > 0;
  const hasJourney = journey.length > 0;

  if (!hasDrivers && !hasJourney) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-14 sm:pb-20">
      <div
        className={`grid gap-4 ${
          hasDrivers && hasJourney ? 'lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]' : ''
        }`}
      >
        {hasDrivers ? (
          <div>
            {driversLabel ? <h2 className={headingClass}>{driversLabel}</h2> : null}

            {/*
             * One column on a phone rather than a two-up grid of half-width
             * cards, which is the row in §7.7 — a paragraph of body copy in a
             * 170px column is a column of single words.
             */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {drivers.map((driver, index) => {
                const mark = findMark(data.marks, driver.mediaKey);

                return (
                  <Reveal key={driver.title} delayMs={index * 70} className="h-full">
                    <article className={`${panelClass} flex h-full flex-col p-6`}>
                      {mark ? (
                        <span className="mb-5 flex size-11 items-center justify-center rounded-lg border border-border-strong text-accent">
                          <Mark mark={mark} className="size-6" />
                        </span>
                      ) : null}

                      <h3 className="font-heading text-base font-semibold text-fg">
                        {driver.title}
                      </h3>

                      {driver.body ? (
                        <p className="mt-2.5 text-sm leading-relaxed text-muted">{driver.body}</p>
                      ) : null}
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        ) : null}

        {hasJourney ? (
          <div>
            {journeyLabel ? <h2 className={headingClass}>{journeyLabel}</h2> : null}

            <Reveal className="mt-4">
              <div className={`${panelClass} p-6`}>
                {/*
                 * The rule down the timeline is a bordered list rather than a
                 * painted pseudo-element, so it ends with the last entry however
                 * many there are. Each dot sits on it with negative insets and
                 * no translate — `index.css` strips every transform under
                 * reduced motion, and a translated dot would slide off the line
                 * (§7.5).
                 *
                 * The entries render in the order they were written. Nothing
                 * sorts them: `year` is a caption, not a number.
                 */}
                <ol className="space-y-5 border-l border-border pl-6">
                  {journey.map((entry) => (
                    <li key={`${entry.year}-${entry.event}`} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[1.9375rem] top-1.5 size-2 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent-halo)]"
                      />
                      <p className="font-heading text-xs font-semibold text-accent">{entry.year}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{entry.event}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>
        ) : null}
      </div>
    </section>
  );
}

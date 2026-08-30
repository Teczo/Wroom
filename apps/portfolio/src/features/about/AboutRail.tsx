import { Mark, findMark } from '../../components/Mark';
import { panelClass } from '../../components/Panel';
import { Reveal } from '../../components/Reveal';
import type { AboutData } from '../content/pageData';

/**
 * The three panels under the intro: the philosophy, the tech row, and what is
 * being read at the moment.
 *
 * Each one is independent — its own heading and its own content, and a panel
 * with neither is not drawn (§7.4). All three empty and the row does not exist.
 *
 * Every heading here is a field. "My Philosophy" and "Currently Exploring" are
 * `philosophy.label` and `exploring.label` from the published record, because a
 * section title written into this file would be copy living in the repo
 * (§2 rule 8).
 */

const headingClass =
  'font-heading text-sm font-semibold uppercase tracking-[0.14em] text-accent';

export function AboutRail({ data }: { data: AboutData }) {
  const { philosophy, techLabel, techMarks, exploring } = data;

  // A key that resolved to nothing is dropped rather than drawn as a gap: a
  // withheld mark costs the row one logo, not its shape.
  const tech = techMarks
    .map((key) => findMark(data.marks, key))
    .filter((mark): mark is NonNullable<typeof mark> => mark !== null);

  const hasPhilosophy = philosophy.label !== '' || philosophy.body !== '';
  const hasTech = tech.length > 0;
  const hasExploring = exploring.items.length > 0;

  if (!hasPhilosophy && !hasTech && !hasExploring) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-14 sm:pb-16">
      <div className="grid gap-4 md:grid-cols-3">
        {hasPhilosophy ? (
          <Reveal className="h-full">
            {/*
             * The quotation mark is painted punctuation rather than a mark from
             * the library: there is nothing behind it to look up or correct
             * (§7.3), and it is decoration, so a screen reader never meets it.
             */}
            <div className={`${panelClass} h-full p-6`}>
              <div className="flex items-start justify-between gap-3">
                {philosophy.label ? <h2 className={headingClass}>{philosophy.label}</h2> : null}
                <span aria-hidden className="-mt-2 font-heading text-3xl leading-none text-accent">
                  ”
                </span>
              </div>

              {philosophy.body ? (
                <p className="mt-4 text-sm leading-relaxed text-muted">{philosophy.body}</p>
              ) : null}
            </div>
          </Reveal>
        ) : null}

        {hasTech ? (
          <Reveal delayMs={80} className="h-full">
            <div className={`${panelClass} h-full p-6`}>
              {techLabel ? <h2 className={headingClass}>{techLabel}</h2> : null}

              {/*
               * Two marks to a row on a phone and four from `sm` up (§7.7). The
               * label under each is the library's, so a logo is corrected in one
               * place rather than everywhere it appears — and it is real text
               * rather than a tooltip, because `Mark` is `aria-hidden` and the
               * row would otherwise announce as nothing at all.
               */}
              <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
                {tech.map((mark) => (
                  <li key={mark.key} className="flex flex-col items-center gap-2 text-center">
                    <Mark mark={mark} className="size-7 text-fg" />
                    <span className="text-[0.6875rem] leading-tight text-muted">
                      {mark.label || mark.key}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}

        {hasExploring ? (
          <Reveal delayMs={160} className="h-full">
            <div className={`${panelClass} h-full p-6`}>
              {exploring.label ? <h2 className={headingClass}>{exploring.label}</h2> : null}

              <ul className="mt-4 space-y-2.5">
                {exploring.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <span aria-hidden className="text-accent">
                      ›
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

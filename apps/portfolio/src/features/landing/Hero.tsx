import { Link } from "react-router-dom";

import { Mark, findMark } from "../../components/Mark";
import { buttonClasses } from "../../components/Button";
import { Terminal } from "./Terminal";
import type { LandingData } from "./landingData";

/**
 * The top of the landing page.
 *
 * Every word here is the published `landing` record — the role pill, greeting,
 * name, statement, disciplines, the two button labels, the tech row and the
 * badge (§2 rule 8). A field left empty in the portal is a piece of the hero
 * that does not render, rather than an empty heading or a placeholder (§7.4).
 *
 * The second button is the one piece that needs two things rather than one: a
 * label, and a CV that publishing resolved into a public URL. Either missing
 * and there is no button, because a download that downloads nothing is worse
 * than no download.
 *
 * Three columns at `lg`, as the design draws them: the words, the portrait, and
 * the rail with the terminal and the purpose panel on it. Below `lg` the rail
 * and the portrait both go and the words carry the page on their own, which is
 * the 390px hero in §7.7 — the composite image dropped, the terminal gone, the
 * headline and the buttons over the background.
 *
 * Nothing in here animates on first paint. There is no `Reveal` above the fold
 * and no entrance transition: the headline is the largest thing on the page and
 * therefore what Lighthouse measures, so it has to be painted rather than
 * arriving. The terminal beside it types, and is decoration that a phone never
 * sees (§7.7).
 */
export function Hero({ data }: { data: LandingData }) {
  const {
    role,
    greeting,
    name,
    statement,
    disciplines,
    heroPrimaryLabel,
    heroSecondaryLabel,
    badge,
    terminalLines,
    terminalTitle,
    techLabel,
    techMarks,
  } = data;
  const portrait = data.portrait;
  const cv = data.cv;

  const hasHeading = greeting !== "" || name !== "";
  const hasBadge = badge.title !== "" || badge.body !== "";

  // A label with nowhere to go is not a button. The first always has somewhere
  // — the work index — so its label is the whole of the test; the second needs
  // the file as well.
  const showPrimary = heroPrimaryLabel !== "";
  const showSecondary = heroSecondaryLabel !== "" && cv !== null;
  const hasActions = showPrimary || showSecondary;

  // Keys that resolved to nothing are dropped rather than drawn as gaps: a
  // withheld mark costs the row one logo, not its shape (§7.4).
  const tech = techMarks
    .map((key) => findMark(data.marks, key))
    .filter((mark): mark is NonNullable<typeof mark> => mark !== null);

  const hasCopy =
    role !== "" ||
    hasHeading ||
    statement !== "" ||
    disciplines.length > 0 ||
    hasActions ||
    tech.length > 0;
  const hasTerminal = terminalLines.length > 0;
  const hasRail = hasTerminal || hasBadge;

  if (!hasCopy && !hasRail && portrait === null) return null;

  /*
   * The columns collapse from the outside in. The portrait is the first to go
   * because it is the one that says nothing, then the rail, and what is left is
   * the words — which is the same page with its ornaments removed rather than a
   * different layout at each width.
   */
  const columns = portrait
    ? hasRail
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)]"
      : "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"
    : hasRail
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      : "";

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20 lg:py-24">
      <div className={`grid items-center gap-12 lg:gap-14 ${columns}`}>
        <div>
          {/*
           * The pill above the headline. A dot and a word — the dot is painted
           * geometry rather than a mark, because there is nothing behind it to
           * look up or correct (§7.3).
           */}
          {role ? (
            <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-2 font-heading text-xs font-medium uppercase tracking-[0.16em] text-fg">
              <span aria-hidden className="size-2 rounded-full bg-accent" />
              {role}
            </p>
          ) : null}

          {/*
           * The name takes a line of its own rather than wrapping after the
           * greeting, because it is the thing on the page a visitor is meant to
           * come away with and a greeting that pushes it onto a ragged second
           * line makes it look incidental.
           */}
          {hasHeading ? (
            <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.05em] text-fg sm:text-6xl lg:text-7xl">
              {/*
               * The trailing space is not decoration. Both halves are blocks,
               * so it changes nothing on screen — but without it the heading's
               * accessible name is one run-together word.
               */}
              {greeting ? <span className="block">{greeting} </span> : null}
              {name ? <span className="block text-accent">{name}</span> : null}
            </h1>
          ) : null}

          {statement ? (
            <p className="mt-6 max-w-md text-lg text-muted sm:text-xl">
              {statement}
            </p>
          ) : null}

          {/*
           * The disciplines are one line in the accent, separated by dots. The
           * separators are decoration — a screen reader gets the list items and
           * nothing else.
           */}
          {disciplines.length > 0 ? (
            <ul className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-sm font-medium uppercase tracking-[0.18em] text-accent">
              {disciplines.map((discipline, index) => (
                <li key={discipline} className="flex items-center gap-3">
                  {index > 0 ? <span aria-hidden>•</span> : null}
                  <span>{discipline}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/*
           * The two buttons. Neither destination is authored: the first is the
           * work index and the second is the CV publishing resolved, because an
           * href written in the portal is a link on a public page that nobody
           * reviews.
           *
           * The CV opens in a tab rather than saving quietly — the file is on
           * the blob container, a different origin, and `download` is ignored
           * across origins. Saying so here so nobody later reads the attribute
           * as a promise it keeps.
           */}
          {hasActions ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {showPrimary ? (
                <Link to="/work" className={buttonClasses("primary", "w-full sm:w-auto")}>
                  {heroPrimaryLabel}
                  <span aria-hidden>↗</span>
                </Link>
              ) : null}

              {showSecondary && cv ? (
                <a
                  href={cv.url}
                  download={cv.filename || undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClasses("secondary", "w-full sm:w-auto")}
                >
                  {heroSecondaryLabel}
                  <span aria-hidden>↓</span>
                </a>
              ) : null}
            </div>
          ) : null}

          {/*
           * The tech row. Marks only, at the size the design draws them, with
           * each one's label carried for a screen reader — `Mark` is
           * `aria-hidden`, so without this the row announces as nothing at all.
           */}
          {tech.length > 0 ? (
            <div className="mt-10">
              {techLabel ? (
                <p className="font-heading text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted">
                  {techLabel}
                </p>
              ) : null}

              <ul className="mt-4 flex flex-wrap items-center gap-5">
                {tech.map((mark) => (
                  // `flex`, because `Mark` renders a span and a bare inline
                  // element ignores a width — it only takes its size as a flex
                  // item, which is how every other caller happens to use it.
                  <li key={mark.key} className="flex items-center">
                    <Mark mark={mark} className="size-8" />
                    <span className="sr-only">{mark.label || mark.key}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/*
         * The portrait, as its own column between the words and the rail.
         *
         * It is bounded by height rather than width, so the element box is the
         * picture and nothing else — the glow behind it and the fade at its
         * foot both measure against the image itself, which letterboxing inside
         * a wider box would throw out. It takes the `hero` variant for the
         * largest slot on the page, never the original upload (§10), and its
         * alt text is whatever was written on the asset — usually nothing,
         * which is the right answer for a picture beside your own name.
         *
         * Nothing here animates, on first paint or at all. The glow and the
         * fade are painted values, so the composition is complete the moment it
         * is drawn and there is nothing for reduced motion to turn off (§7.5).
         */}
        {portrait ? (
          <div className="relative hidden lg:block">
            {/*
             * The light behind the figure, so it stands in the room rather than
             * on top of it. The colour is the same token the lit panels use —
             * §7.1 admits no hex outside `index.css`.
             */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-10 top-6 mx-auto max-w-xs rounded-full bg-[radial-gradient(circle,var(--color-accent-glow),transparent_70%)] blur-3xl"
            />

            {/*
             * The fade at the foot. The upload is a crop, and a crop ends in a
             * straight line across the page unless the last of it is masked
             * away.
             */}
            <img
              src={portrait.variants?.hero ?? portrait.url}
              alt={portrait.alt}
              className="relative mx-auto max-h-[30rem] w-auto max-w-full object-contain [-webkit-mask-image:linear-gradient(to_bottom,black_78%,transparent)] [mask-image:linear-gradient(to_bottom,black_78%,transparent)]"
            />
          </div>
        ) : null}

        {/*
         * The rail: the terminal, and the purpose panel under it. Both are
         * decoration for a wide screen and are gone below `lg` — a phone gets
         * the words (§7.7).
         */}
        {hasRail ? (
          <div className="hidden flex-col gap-5 lg:flex">
            {hasTerminal ? (
              <Terminal lines={terminalLines} title={terminalTitle} />
            ) : null}

            {/*
             * The purpose panel: a rule in the accent down its left edge rather
             * than a full border, so it reads as a note pinned to the terminal
             * instead of another card. The glyph in its corner is painted
             * geometry, not a mark — there is nothing behind it to look up.
             */}
            {hasBadge ? (
              <div className="rounded-r-lg border-y border-r border-border border-l-2 border-l-accent bg-surface/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  {badge.title ? (
                    <p className="font-heading text-sm font-bold text-accent">
                      {badge.title}
                    </p>
                  ) : null}
                  <span
                    aria-hidden
                    className="shrink-0 font-mono text-xs text-muted"
                  >
                    &lt;/&gt;
                  </span>
                </div>
                {badge.body ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {badge.body}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

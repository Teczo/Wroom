import { Link } from "react-router-dom";

import { Mark, findMark } from "../../components/Mark";
import { buttonClasses } from "../../components/Button";
import { AppShelf } from "./AppShelf";
import { Terminal } from "./Terminal";
import { useFeaturedProjects } from "./api";
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
 * The rail on the right is the code pane and the status readout, both written
 * in the portal like everything else. They are decoration for a wide screen and
 * are gone below `lg` — a phone gets the words (§7.7).
 *
 * The phone under the terminal is the published projects that have an app icon.
 * It shares the row's query rather than making one of its own, and it is gone
 * below `lg` like the rest of the composition.
 *
 * The portrait is `portrait` from the same record — resolved from an upload
 * into public-container URLs at publish, because the portfolio may not read
 * `assets` itself (§6, §8). It is the composite image §7.7 drops at 390px, so
 * it is gone below `md`.
 *
 * Nothing in here animates on first paint. There is no `Reveal` above the fold
 * and no entrance transition: the headline is the largest thing on the page and
 * therefore what Lighthouse measures, so it has to be painted rather than
 * arriving. The terminal beside it types, and is decoration that a phone never
 * sees (§7.7).
 *
 * At 390px this is the whole hero — the heading, the statement, the disciplines
 * and the badge over the page background, with the terminal gone. The button
 * the old hero carried is now the bar at the foot of the page, which is where
 * the design puts the site's one CTA.
 */
/**
 * The pane of source beside the terminal.
 *
 * `code` is rendered as text and nothing else — no highlighter, and never
 * `dangerouslySetInnerHTML`, which in this app is reserved for library SVG that
 * a write-time sanitiser has already been through (§7.3). It wraps rather than
 * scrolling sideways, because it is a texture at this size, not something
 * anybody reads a line of.
 */
function CodePane({ tabs, code }: { tabs: string[]; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-deep/70">
      {tabs.length > 0 ? (
        <div className="flex flex-wrap gap-4 border-b border-border px-5 py-3 font-heading text-[0.625rem] uppercase tracking-[0.14em] text-muted">
          {tabs.map((tab) => (
            <span key={tab}>{tab}</span>
          ))}
        </div>
      ) : null}

      {code ? (
        <pre className="whitespace-pre-wrap break-words p-5 font-mono text-[0.6875rem] leading-[1.7] text-accent/60">
          {code}
        </pre>
      ) : null}
    </div>
  );
}

/**
 * The readout under it: a label and a value, as many times as were written.
 *
 * It carries no heading of its own — there is no field for one, and a title
 * typed into this file would be portfolio copy that no one can change from the
 * portal (§2 rule 8).
 */
function StatusPanel({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="rounded-2xl border border-border bg-surface-deep/70 px-5 py-4">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 py-1.5"
        >
          <dt className="font-heading text-[0.625rem] uppercase tracking-[0.14em] text-muted">
            {row.label}
          </dt>
          <dd className="font-heading text-xs text-accent">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Hero({
  data,
  featuredLimit,
  featuredEnabled,
}: {
  data: LandingData;
  featuredLimit: number;
  featuredEnabled: boolean;
}) {
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
    codePanel,
    statusRows,
  } = data;
  const portrait = data.portrait;
  const cv = data.cv;

  // The same query the row below runs, deduplicated by TanStack Query: one
  // request, and the phone and the cards fill at the same moment.
  const projects = useFeaturedProjects(featuredLimit, featuredEnabled);
  const apps = (projects.data?.items ?? []).filter(
    (project) => project.appIcon?.svg,
  );

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
    tech.length > 0 ||
    hasBadge;
  const hasTerminal = terminalLines.length > 0;
  const hasCode = codePanel.tabs.length > 0 || codePanel.code !== "";
  const hasRail = hasCode || statusRows.length > 0;
  const hasStage = hasTerminal || apps.length > 0 || portrait !== null;

  if (!hasCopy && !hasStage && !hasRail) return null;

  /*
   * Three columns when everything is there, two when one of them is not, and
   * one when neither is. The rail is the narrowest of them and is the first to
   * go: it is hidden below `lg`, so at tablet width this is the copy and the
   * terminal, which is the same page with one fewer ornament.
   */
  const columns = hasStage
    ? hasRail
      ? "md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.72fr)]"
      : "md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
    : hasRail
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]"
      : "";

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20 lg:py-24">
      <div className={`grid items-center gap-12 lg:gap-16 ${columns}`}>
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

          {hasHeading ? (
            <h1 className="text-5xl font-bold leading-[0.98] tracking-[-0.05em] text-fg sm:text-6xl lg:text-7xl">
              {greeting ? <span>{greeting} </span> : null}
              {name ? <span className="text-accent">{name}</span> : null}
            </h1>
          ) : null}

          {statement ? (
            <p className="mt-6 max-w-md text-lg text-muted sm:text-xl">
              {statement}
            </p>
          ) : null}

          {/*
           * The disciplines are one line in the accent, separated by dots, as
           * the reference draws them. The separators are decoration — a screen
           * reader gets the list items and nothing else.
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

          {/*
           * The purpose panel: a rule in the accent down its left edge rather
           * than a full border, so it reads as a pull quote off the headline
           * instead of another card.
           */}
          {hasBadge ? (
            <div className="mt-12 max-w-xs rounded-r-lg border-y border-r border-border border-l-2 border-l-accent bg-surface/70 p-5">
              {badge.title ? (
                <p className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  {badge.title}
                </p>
              ) : null}
              {badge.body ? (
                <p className="mt-2 text-xs uppercase tracking-wide text-muted">
                  {badge.body}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasStage ? (
          <div className="hidden flex-col gap-6 md:flex">
            {hasTerminal ? <Terminal lines={terminalLines} title={terminalTitle} /> : null}

            {/*
             * The portrait, the screen and the phone are one composition rather
             * than three stacked boxes. The portrait rises into the foot of the
             * terminal — which is empty space, since the panel holds its full
             * height from the first frame while the script types — and the
             * phone sits over its lower right corner. Positioned, so it paints
             * in front of the panel it overlaps; the pull-up only applies when
             * there is a terminal above to overlap.
             *
             * It is bounded by height rather than width, so the element box
             * is the picture and nothing else: the fade at its foot and the
             * overlap above it both measure against the image itself, which
             * letterboxing inside a wider box would throw out. It takes the
             * `hero`
             * variant for the largest slot on the page, never the original
             * upload (§10), and its alt text is whatever was written on the
             * asset — usually nothing, which is the right answer for a picture
             * beside your own name.
             *
             * Nothing here animates, on first paint or at all. The glow and the
             * fade are painted values, so the composition is complete the
             * moment it is drawn and there is nothing for reduced motion to
             * turn off (§7.5).
             */}
            {portrait || apps.length > 0 ? (
              <div
                className={`relative ${hasTerminal && portrait ? "-mt-20 lg:-mt-32" : ""}`}
              >
                {portrait ? (
                  <>
                    {/*
                     * The light behind the figure, so it stands in the room
                     * rather than on top of it. The colour is the same token
                     * the lit panels use — §7.1 admits no hex outside
                     * `index.css`.
                     */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-10 top-6 mx-auto max-w-xs rounded-full bg-[radial-gradient(circle,var(--color-accent-glow),transparent_70%)] blur-3xl"
                    />

                    {/*
                     * The fade at the foot. The upload is a crop, and a crop
                     * ends in a straight line across the page unless the last
                     * of it is masked away.
                     */}
                    <img
                      src={portrait.variants?.hero ?? portrait.url}
                      alt={portrait.alt}
                      className="relative mx-auto max-h-[26rem] w-auto max-w-full object-contain lg:max-h-[28rem] [-webkit-mask-image:linear-gradient(to_bottom,black_72%,transparent)] [mask-image:linear-gradient(to_bottom,black_72%,transparent)]"
                    />
                  </>
                ) : null}

                {apps.length > 0 ? (
                  <div
                    className={
                      portrait
                        ? "absolute bottom-0 right-0 hidden lg:block"
                        : "hidden justify-center lg:flex"
                    }
                  >
                    <AppShelf apps={apps} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasRail ? (
          <div className="hidden flex-col gap-5 lg:flex">
            {hasCode ? (
              <CodePane tabs={codePanel.tabs} code={codePanel.code} />
            ) : null}
            {statusRows.length > 0 ? <StatusPanel rows={statusRows} /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

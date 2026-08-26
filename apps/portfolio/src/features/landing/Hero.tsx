import { AppShelf } from './AppShelf';
import { Terminal } from './Terminal';
import { useFeaturedProjects } from './api';
import type { LandingData } from './landingData';

/**
 * The top of the landing page.
 *
 * Every word here is the published `landing` record — greeting, name,
 * statement, disciplines and badge (§2 rule 8). A field left empty in the
 * portal is a piece of the hero that does not render, rather than an empty
 * heading or a placeholder (§7.4).
 *
 * The rail on the right is the code pane and the status readout, both written
 * in the portal like everything else. They are decoration for a wide screen and
 * are gone below `lg` — a phone gets the words (§7.7).
 *
 * The phone under the terminal is the published projects that have an app icon.
 * It shares the row's query rather than making one of its own, and it is gone
 * below `lg` like the rest of the composition.
 *
 * The portrait the design also shows is still absent: it is an asset the
 * portfolio may not resolve, so it stays out rather than being invented (§11).
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
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-1.5">
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
  const { greeting, name, statement, disciplines, badge, terminalLines, codePanel, statusRows } =
    data;

  // The same query the row below runs, deduplicated by TanStack Query: one
  // request, and the phone and the cards fill at the same moment.
  const projects = useFeaturedProjects(featuredLimit, featuredEnabled);
  const apps = (projects.data?.items ?? []).filter((project) => project.appIcon?.svg);

  const hasHeading = greeting !== '' || name !== '';
  const hasBadge = badge.title !== '' || badge.body !== '';
  const hasCopy = hasHeading || statement !== '' || disciplines.length > 0 || hasBadge;
  const hasTerminal = terminalLines.length > 0;
  const hasCode = codePanel.tabs.length > 0 || codePanel.code !== '';
  const hasRail = hasCode || statusRows.length > 0;
  const hasStage = hasTerminal || apps.length > 0;

  if (!hasCopy && !hasStage && !hasRail) return null;

  /*
   * Three columns when everything is there, two when one of them is not, and
   * one when neither is. The rail is the narrowest of them and is the first to
   * go: it is hidden below `lg`, so at tablet width this is the copy and the
   * terminal, which is the same page with one fewer ornament.
   */
  const columns = hasStage
    ? hasRail
      ? 'md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.72fr)]'
      : 'md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]'
    : hasRail
      ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]'
      : '';

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20 lg:py-24">
      <div className={`grid items-center gap-12 lg:gap-16 ${columns}`}>
        <div>
          {hasHeading ? (
            <h1 className="text-5xl font-bold leading-[0.98] tracking-[-0.05em] text-fg sm:text-6xl lg:text-7xl">
              {greeting ? <span>{greeting} </span> : null}
              {name ? <span className="text-accent">{name}</span> : null}
            </h1>
          ) : null}

          {statement ? (
            <p className="mt-6 max-w-md text-lg text-muted sm:text-xl">{statement}</p>
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
                <p className="mt-2 text-xs uppercase tracking-wide text-muted">{badge.body}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasStage ? (
          <div className="hidden flex-col gap-6 md:flex">
            {hasTerminal ? <Terminal lines={terminalLines} /> : null}
            {/* Tucked under the screen at the right, and only on a wide one. */}
            <div className="hidden self-end lg:block">
              <AppShelf apps={apps} />
            </div>
          </div>
        ) : null}

        {hasRail ? (
          <div className="hidden flex-col gap-5 lg:flex">
            {hasCode ? <CodePane tabs={codePanel.tabs} code={codePanel.code} /> : null}
            {statusRows.length > 0 ? <StatusPanel rows={statusRows} /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

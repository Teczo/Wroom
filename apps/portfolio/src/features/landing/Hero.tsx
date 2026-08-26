import { Terminal } from './Terminal';
import type { LandingData } from './landingData';

/**
 * The top of the landing page.
 *
 * Every word here is the published `landing` record — greeting, name,
 * statement, disciplines and badge (§2 rule 8). A field left empty in the
 * portal is a piece of the hero that does not render, rather than an empty
 * heading or a placeholder (§7.4).
 *
 * The design puts a portrait, a phone and two instrument panels around the
 * screen in the middle. None of them has a field behind it — a portrait is an
 * asset the portfolio may not resolve and the panels are copy nobody can
 * write — so they are absent rather than invented, and the stage is the screen
 * alone until the ticket that adds them (§11).
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
export function Hero({ data }: { data: LandingData }) {
  const { greeting, name, statement, disciplines, badge, terminalLines } = data;

  const hasHeading = greeting !== '' || name !== '';
  const hasBadge = badge.title !== '' || badge.body !== '';
  const hasCopy = hasHeading || statement !== '' || disciplines.length > 0 || hasBadge;
  const hasTerminal = terminalLines.length > 0;

  if (!hasCopy && !hasTerminal) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20 lg:py-24">
      <div
        className={`grid items-center gap-12 lg:gap-16 ${
          hasTerminal ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]' : ''
        }`}
      >
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

        {hasTerminal ? <Terminal lines={terminalLines} className="hidden md:block" /> : null}
      </div>
    </section>
  );
}

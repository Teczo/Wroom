import { Link } from 'react-router-dom';

import { Terminal } from './Terminal';
import type { LandingData } from './landingData';

/**
 * The top of the landing page.
 *
 * Every word here is the published `landing` record — greeting, name,
 * statement, disciplines, badge and the label on the button (§2 rule 8). A
 * field left empty in the portal is a piece of the hero that does not render,
 * rather than an empty heading or a placeholder (§7.4).
 *
 * Nothing in here animates on first paint. There is no `Reveal` above the fold
 * and no entrance transition: the headline is the largest thing on the page and
 * therefore what Lighthouse measures, so it has to be painted rather than
 * arriving. The terminal beside it types, and is decoration that a phone never
 * sees (§7.7).
 *
 * At 390px this is the whole hero — the heading, the disciplines, the badge and
 * the button over the page background, with the terminal gone.
 */
export function Hero({ data }: { data: LandingData }) {
  const { greeting, name, statement, disciplines, badge, ctaLabel, terminalLines } = data;

  const hasHeading = greeting !== '' || name !== '';
  const hasBadge = badge.title !== '' || badge.body !== '';
  const hasCopy =
    hasHeading || statement !== '' || disciplines.length > 0 || hasBadge || ctaLabel !== '';
  const hasTerminal = terminalLines.length > 0;

  if (!hasCopy && !hasTerminal) return null;

  return (
    <section className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
      <div className={`grid items-center gap-10 ${hasTerminal ? 'md:grid-cols-2' : ''}`}>
        <div>
          {hasHeading ? (
            <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
              {greeting ? <span>{greeting} </span> : null}
              {name ? <span className="text-accent">{name}</span> : null}
            </h1>
          ) : null}

          {statement ? (
            <p className="mt-4 max-w-xl text-lg text-muted sm:text-xl">{statement}</p>
          ) : null}

          {disciplines.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {disciplines.map((discipline) => (
                <li
                  key={discipline}
                  className="rounded-full border border-border bg-surface px-3 py-1 font-heading text-xs font-medium uppercase tracking-wide text-muted"
                >
                  {discipline}
                </li>
              ))}
            </ul>
          ) : null}

          {hasBadge ? (
            <div className="mt-8 max-w-md rounded-2xl border border-border bg-surface p-5">
              {badge.title ? (
                <p className="font-heading text-sm font-bold uppercase tracking-widest text-accent">
                  {badge.title}
                </p>
              ) : null}
              {badge.body ? <p className="mt-2 text-sm text-muted">{badge.body}</p> : null}
            </div>
          ) : null}

          {ctaLabel ? (
            <Link
              to="/contact"
              className="mt-8 flex min-h-12 w-full items-center justify-center rounded-lg bg-accent px-6 font-heading text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover sm:inline-flex sm:w-auto"
            >
              {ctaLabel}
            </Link>
          ) : null}
        </div>

        {hasTerminal ? <Terminal lines={terminalLines} className="hidden md:block" /> : null}
      </div>
    </section>
  );
}

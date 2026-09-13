import { useMemo, useState } from 'react';
import type { PublishedProject } from '@wroom/shared';

import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { ProjectCard } from '../features/work/ProjectCard';
import { WorkFilters } from '../features/work/WorkFilters';
import {
  DEFAULT_SORT,
  categoriesOf,
  filterProjects,
  type CategoryFilter,
  type SortKey,
} from '../features/work/filterProjects';
import { usePublishedProjects } from '../features/work/api';
import { useInView } from '../lib/useInView';

/**
 * The work index — everything published, in one grid, with the chips, the
 * search box and the order above it.
 *
 * The filtering itself is in `features/work/filterProjects.ts` and the controls
 * are in `features/work/WorkFilters.tsx`; this page holds the header, the four
 * states (§7) and the grid.
 *
 * The heading and the line under it are still written here rather than read
 * from `siteContent`, which has no `work` key to read them from. That is a
 * standing gap, not a new one.
 */

/** Held between one card and the next as a row of the grid reveals. */
const CARD_STEP_MS = 70;

/** Cards across the grid at its widest. The stagger repeats every this many. */
const GRID_COLUMNS = 3;

/**
 * One card, revealing itself.
 *
 * A reveal per card rather than one for the whole grid, and that is not a
 * preference. A grid of five cards on a phone is nearly two thousand pixels
 * tall, and an observer watching the list as a whole asks for a share of *that*
 * to be on screen before it fires — which never happens above the fold, so the
 * whole grid sits at `opacity: 0` until something scrolls. Watching each card
 * asks a question each card can answer.
 *
 * The delay is the card's place across a row, so three cards arriving together
 * at desktop width arrive one after another. Down a single column each card is
 * revealed on its own as it is scrolled to, and the delay is the fraction of a
 * second before it starts.
 */
function GridCard({ project, index }: { project: PublishedProject; index: number }) {
  const { ref, inView } = useInView<HTMLLIElement>();

  return (
    <li ref={ref}>
      <ProjectCard
        project={project}
        variant="index"
        inView={inView}
        delayMs={(index % GRID_COLUMNS) * CARD_STEP_MS}
      />
    </li>
  );
}

export function WorkPage() {
  const projects = usePublishedProjects();

  const [category, setCategory] = useState<CategoryFilter>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);

  const items = useMemo(() => projects.data?.items ?? [], [projects.data]);
  const categories = useMemo(() => categoriesOf(items), [items]);

  const shown = useMemo(
    () => filterProjects({ projects: items, category, search, sort }),
    [items, category, search, sort],
  );

  const hasPublished = projects.isSuccess && items.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-heading text-xs font-medium uppercase tracking-[0.24em] text-accent">
          <span aria-hidden>— </span>Portfolio
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-fg sm:text-6xl">
          Projects I&rsquo;ve <span className="text-accent">Built</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted">
          A collection of products, platforms, and experiments across XR, web, mobile, and the
          systems behind them.
        </p>
      </header>

      {projects.isPending ? <LoadingState label="Loading work…" /> : null}

      {projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : null}

      {projects.isSuccess && items.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          whatToDoNext="Work appears here once it has been published from the portal. Check back shortly."
        />
      ) : null}

      {hasPublished ? (
        <>
          <WorkFilters
            categories={categories}
            category={category}
            onCategoryChange={setCategory}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
          />

          {/* Announced rather than merely drawn: a visitor using a screen reader
              types into the box and hears how many are left. */}
          <p className="mt-6 text-center text-sm text-muted" role="status">
            {shown.length} {shown.length === 1 ? 'project' : 'projects'}
          </p>

          {/*
           * Only reachable while a chip or a word is on, because with neither
           * the grid is the whole published list — which is not empty inside
           * this branch. So it says "no match", never "nothing published": the
           * two are different facts and a visitor must not hear one for the
           * other (§7).
           */}
          {shown.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base font-medium text-fg">No projects match that</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Try a different word, or clear the search and choose another category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategory(null);
                  setSearch('');
                }}
                className="mt-6 min-h-11 rounded-full border border-border px-5 font-heading text-sm font-medium text-fg transition-colors duration-300 ease-out-expo hover:border-border-strong hover:text-accent"
              >
                Show all projects
              </button>
            </div>
          ) : (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((project, index) => (
                /*
                 * Keyed by the project rather than by position, so filtering
                 * moves the cards that remain instead of re-using a card's
                 * element for a different project — which would play the
                 * reveal again on every keystroke.
                 */
                <GridCard key={project._id} project={project} index={index} />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

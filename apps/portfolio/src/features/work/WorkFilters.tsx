import { useId } from 'react';

import { SORT_OPTIONS, type CategoryFilter, type SortKey } from './filterProjects';

/**
 * The controls above the work grid: the category chips, the search box and the
 * order.
 *
 * Everything here is chrome. The only content that reaches it is `categories`,
 * which is the list of words the published projects already carry — this file
 * names no project, no category and no technology (§2 rule 8).
 *
 * The chips carry no icons. A category is a free string on the snapshot and
 * `docs/DATA_MODEL.md` gives it no icon field, so there is nothing to draw and
 * nothing to invent (§7.3, §11).
 */

/** The magnifier and the chevron. Chrome, drawn inline — not marks from the
 * library, which holds content (§7.3). */
function SearchGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    /*
     * `aria-pressed` rather than a radio group: these are buttons that change
     * what the list below shows, and a screen reader should hear the chip it is
     * on as pressed. `snap-start` is what makes the row swipe cleanly on a
     * phone, where it runs off the right edge (§7.7).
     */
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 shrink-0 snap-start whitespace-nowrap rounded-full border px-4 font-heading text-sm font-medium transition-colors duration-300 ease-out-expo ${
        active
          ? 'border-accent bg-accent text-on-accent'
          : 'border-border bg-surface text-muted hover:border-border-strong hover:text-fg'
      }`}
    >
      {label}
    </button>
  );
}

export function WorkFilters({
  categories,
  category,
  onCategoryChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: {
  categories: readonly string[];
  category: CategoryFilter;
  onCategoryChange: (next: CategoryFilter) => void;
  search: string;
  onSearchChange: (next: string) => void;
  sort: SortKey;
  onSortChange: (next: SortKey) => void;
}) {
  const searchId = useId();
  const sortId = useId();

  return (
    <div className="mt-10">
      {/*
       * One line that runs off the right edge and is swiped on a phone, wrapping
       * and centring from `md` up where the whole row fits (§7.7). The negative
       * margin and matching padding are what let it bleed to the screen edge
       * inside a padded page, so a chip is never cut off mid-word at the gutter.
       */}
      <div
        className="-mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <Chip label="All" active={category === null} onClick={() => onCategoryChange(null)} />

        {categories.map((name) => (
          <Chip
            key={name}
            label={name}
            active={category === name}
            onClick={() => onCategoryChange(name)}
          />
        ))}
      </div>

      {/* Search over the width, order beside it — stacked on a phone, where the
          two side by side would leave neither wide enough to read. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Search projects
          </label>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <SearchGlyph />
          </span>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search projects…"
            className="block min-h-12 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-base text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="relative sm:w-52">
          <label htmlFor={sortId} className="sr-only">
            Order projects
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            className="block min-h-12 w-full appearance-none rounded-full border border-border bg-surface pl-4 pr-10 text-base text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronGlyph />
        </div>
      </div>
    </div>
  );
}

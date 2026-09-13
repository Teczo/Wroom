import type { PublishedProject } from '@wroom/shared';

/**
 * The work index's filtering, searching and ordering — all of it, and nothing
 * else. No React in this file, so the behaviour can be read and reasoned about
 * without a component around it.
 *
 * Every one of these runs in the browser over the projects already fetched.
 * The index asks `/public/projects` for the list once and then works on it
 * locally: no search route, no filter parameters, nothing added to the
 * allowlist in §6. A portfolio holds tens of projects, not thousands.
 */

/** The chip a visitor pressed. `null` is the "All" chip. */
export type CategoryFilter = string | null;

export type SortKey = 'recent' | 'oldest' | 'name' | 'featured';

export interface SortOption {
  key: SortKey;
  label: string;
}

/**
 * The order the row of choices is offered in, with `recent` first because it is
 * the default. `featured` is the order the API answered in — featured projects
 * first, then `sortOrder` — which is the order the portal curates.
 */
export const SORT_OPTIONS: readonly SortOption[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name', label: 'Name A–Z' },
  { key: 'featured', label: 'Featured first' },
];

export const DEFAULT_SORT: SortKey = 'recent';

/**
 * The categories present in the published work, in the order the API answered.
 *
 * Nothing here holds a list of categories and nothing decides which ones exist:
 * `category` is free text on the snapshot, so a chip appears because a project
 * carries those words and stops being drawn when the last one carrying them
 * goes. A category has no icon, description or order of its own — there is no
 * field for any of the three in `docs/DATA_MODEL.md`, and inventing them to
 * match a design reference is what §2 rule 8 forbids.
 *
 * A project with no category gets no chip. There is deliberately no "Other"
 * chip: that word would be copy written into the repo about somebody's work.
 * Those projects are still reachable — they show under "All".
 */
export function categoriesOf(projects: readonly PublishedProject[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const project of projects) {
    const name = project.category.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
}

/**
 * Everything about one project that a visitor could reasonably type.
 *
 * The tech and platform marks are searched by their label, which is the word a
 * visitor knows the mark by — somebody typing "webxr" is looking for the
 * project with that logo on it, not for the word in a paragraph.
 */
function haystack(project: PublishedProject): string {
  return [
    project.name,
    project.productName,
    project.category,
    project.tagline,
    project.shortDescription,
    ...project.techStack.map((mark) => mark.label),
    ...project.platforms.map((mark) => mark.label),
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Every word typed has to appear somewhere, rather than the whole phrase
 * appearing as typed. "react xr" then finds the project that is both, which is
 * what a person means by it — an exact-phrase match would find nothing unless
 * those two words happened to sit next to each other in one field.
 */
function matchesSearch(project: PublishedProject, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const text = haystack(project);
  return terms.every((term) => text.includes(term));
}

/** Newest first, and anything without a date sorts last rather than first. */
function byPublishedAt(a: PublishedProject, b: PublishedProject, newestFirst: boolean): number {
  const left = Date.parse(a.publishedAt);
  const right = Date.parse(b.publishedAt);

  if (Number.isNaN(left) && Number.isNaN(right)) return 0;
  if (Number.isNaN(left)) return 1;
  if (Number.isNaN(right)) return -1;

  return newestFirst ? right - left : left - right;
}

export interface FilterInput {
  projects: readonly PublishedProject[];
  category: CategoryFilter;
  search: string;
  sort: SortKey;
}

/**
 * Chip, then words, then order — and a new array every time, so the list the
 * API cached is never rearranged under it.
 */
export function filterProjects({
  projects,
  category,
  search,
  sort,
}: FilterInput): PublishedProject[] {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);

  const kept = projects.filter((project) => {
    if (category !== null && project.category.trim() !== category) return false;
    return matchesSearch(project, terms);
  });

  // `featured` is the order the API already answered in, so it is the one sort
  // that does nothing at all.
  if (sort === 'featured') return kept;

  return kept.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    return byPublishedAt(a, b, sort === 'recent');
  });
}

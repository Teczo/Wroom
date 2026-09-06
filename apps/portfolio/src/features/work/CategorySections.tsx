import { useId, useState } from 'react';
import type { PublishedProject } from '@wroom/shared';

import { Carousel } from '../../components/Carousel';
import { entering, useEntered } from '../../lib/entrance';
import { useInView } from '../../lib/useInView';
import { ProjectCard } from './ProjectCard';

/**
 * The work index, grouped by the chip a project carries.
 *
 * `category` is a free string on the snapshot — "XR / Web Platform" — so a
 * group is every project that wrote the same words. Nothing here holds a list
 * of categories, and nothing decides which ones exist: publish a project with a
 * new chip and it gets a section, publish the last one under a chip somewhere
 * else and that section stops being drawn.
 *
 * **A category has no icon, no description and no order of its own**, because
 * `docs/DATA_MODEL.md` has no field for any of the three. The design reference
 * draws all three; inventing them to match a picture is what §2 rule 8 forbids.
 * So a section header is the words a project already carries, the count, and
 * the control — and the order is the order the API answered in, which is
 * featured first and then `sortOrder`.
 */

/** Held between one card and the next as a row opens. */
const CARD_STEP_MS = 90;

/** Held between one section and the next as the page reveals. */
const SECTION_STEP_MS = 70;

export interface CategoryGroup {
  name: string;
  projects: PublishedProject[];
}

/**
 * Projects in, sections out — plus whatever had no chip to be filed under.
 *
 * A project with an empty `category` is not given one. There is no "Other"
 * heading here and there must not be: that word would be copy written into the
 * repo about somebody's work. Those projects are drawn as a plain grid instead,
 * with no heading at all (§7.4).
 *
 * Insertion order is kept rather than sorted alphabetically, so the order the
 * portal publishes in is the order a visitor reads in.
 */
export function groupByCategory(items: PublishedProject[]): {
  groups: CategoryGroup[];
  ungrouped: PublishedProject[];
} {
  const groups: CategoryGroup[] = [];
  const byName = new Map<string, CategoryGroup>();
  const ungrouped: PublishedProject[] = [];

  for (const project of items) {
    const name = project.category.trim();

    if (!name) {
      ungrouped.push(project);
      continue;
    }

    let group = byName.get(name);
    if (!group) {
      group = { name, projects: [] };
      byName.set(name, group);
      groups.push(group);
    }
    group.projects.push(project);
  }

  return { groups, ungrouped };
}

/** The control's glyph. Chrome, drawn inline — not a mark from the library (§7.3). */
function Sign({ open }: { open: boolean }) {
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
      <path d="M5 12h14" />
      {/*
       * The upright stroke of the plus, faded out rather than removed, so the
       * control turns from one sign into the other instead of swapping glyphs.
       *
       * Opacity and not a transform, deliberately: `index.css` sets
       * `transform: none` under reduced motion, and a stroke hidden by a scale
       * would come back — the control would read "+" on an open section for
       * every visitor with the preference set. Opacity survives that rule, and
       * only its duration is taken away (§7.5).
       */}
      <path
        d="M12 5v14"
        className={`transition-opacity duration-300 ease-out-expo ${
          open ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </svg>
  );
}

/**
 * The row inside an open section.
 *
 * A carousel at every width, for the same reason the landing row is one: one
 * card per viewport on a phone, swiped, arrows hidden and dots doing the
 * telling (§7.7), and a snapping row of several at desktop width. A section
 * holding fewer cards than fit draws no controls at all — `Carousel` works that
 * out for itself.
 *
 * `useEntered` here rather than an observer: the panel only exists once it has
 * been opened, so its cards are on screen by definition and there is nothing to
 * wait to be scrolled to. Under reduced motion it is true from the first
 * render and the row simply appears (§7.5).
 */
function ProjectRow({ label, projects }: { label: string; projects: PublishedProject[] }) {
  const entered = useEntered();

  return (
    <Carousel
      label={label}
      controls="side"
      className="mt-2"
      // One card per viewport on a phone; from `sm` up a wider card, three of
      // which fill the row at desktop width.
      slideClassName="w-full sm:w-[21rem]"
    >
      {projects.map((project, index) => (
        <ProjectCard
          key={project._id}
          project={project}
          variant="index"
          inView={entered}
          delayMs={index * CARD_STEP_MS}
        />
      ))}
    </Carousel>
  );
}

/**
 * One category, open or shut.
 *
 * A disclosure: the header is the button, `aria-expanded` says which way it is,
 * and the panel is mounted only while it is open — which is also what gives the
 * row its stagger each time it is opened. The first section on the page starts
 * open so the page never loads as a stack of closed bars.
 */
function CategorySection({
  group,
  index,
  defaultOpen,
}: {
  group: CategoryGroup;
  index: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { ref, inView } = useInView<HTMLElement>();
  const enter = entering(inView, 'rise', index * SECTION_STEP_MS, 700);
  const panelId = useId();

  const count = group.projects.length;

  return (
    <section
      ref={ref}
      style={enter.style}
      className={`overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-deep ${enter.className}`}
    >
      {/*
       * The heading is the button's own text rather than a heading beside it,
       * so the list a screen reader builds from this page is the list of
       * categories and each one is the thing you press.
       */}
      <h2>
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          className="group flex w-full items-center gap-4 p-5 text-left transition-colors duration-300 ease-out-expo hover:bg-surface-hover sm:p-6"
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-heading text-xl font-semibold text-fg sm:text-2xl">
              {group.name}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 font-heading text-[0.6875rem] font-medium text-accent">
              {count} {count === 1 ? 'Project' : 'Projects'}
            </span>
          </span>

          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-fg transition-colors duration-300 ease-out-expo group-hover:border-border-strong group-hover:text-accent"
          >
            <Sign open={open} />
          </span>
        </button>
      </h2>

      {open ? (
        <div id={panelId} className="border-t border-border px-5 pb-6 sm:px-6">
          <ProjectRow label={`${group.name} projects`} projects={group.projects} />
        </div>
      ) : null}
    </section>
  );
}

/** Projects with no chip. A grid, and deliberately no heading over it. */
function UngroupedProjects({ projects }: { projects: PublishedProject[] }) {
  const { ref, inView } = useInView<HTMLUListElement>();

  return (
    <ul ref={ref} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <li key={project._id}>
          <ProjectCard
            project={project}
            variant="index"
            inView={inView}
            delayMs={index * CARD_STEP_MS}
          />
        </li>
      ))}
    </ul>
  );
}

export function CategorySections({ projects }: { projects: PublishedProject[] }) {
  const { groups, ungrouped } = groupByCategory(projects);

  return (
    <div className="space-y-4">
      {ungrouped.length > 0 ? <UngroupedProjects projects={ungrouped} /> : null}

      {groups.map((group, index) => (
        <CategorySection
          key={group.name}
          group={group}
          index={index}
          // Only the first bar on the page opens itself, and only when it is
          // the first thing under the header — a page that opens with a stack
          // of shut bars says nothing about the work behind them.
          defaultOpen={index === 0 && ungrouped.length === 0}
        />
      ))}
    </div>
  );
}

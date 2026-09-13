import type { PublishedProject } from '@wroom/shared';
import { Link } from 'react-router-dom';

import { Mark } from '../../components/Mark';
import { entering } from '../../lib/entrance';
import { usePointerTilt } from '../../lib/usePointerTilt';

/**
 * One published project, as a card. The landing row and the work index both
 * draw this — a visitor moving between the two is looking at the same object,
 * and two cards that were nearly the same would drift apart on the next change.
 *
 * The two variants differ only in what they say around the picture:
 *
 * - `featured` is the landing row. Name, blurb, and the category as a chip at
 *   the foot. Nothing else — the row is a taste of the work, not an index.
 * - `index` is the work page. The category sits above the name as a label, the
 *   technologies ride at the foot as a row of words, and under them the link
 *   affordance, because a card in a list of many has to say where it goes.
 *
 * Every string here is snapshot data. Nothing about a project is written into
 * this file (§2 rule 8).
 */
export type ProjectCardVariant = 'featured' | 'index';

/** How many technologies a card names before it starts counting them. */
const TECH_PILLS = 4;

export function ProjectCard({
  project,
  inView,
  delayMs,
  variant = 'featured',
}: {
  project: PublishedProject;
  /** The section's reveal. The card waits for it rather than owning one. */
  inView: boolean;
  /** This card's place in its row's stagger. */
  delayMs: number;
  variant?: ProjectCardVariant;
}) {
  // The card variant for a card slot — never the original upload (§10).
  const image = project.heroImage
    ? (project.heroImage.variants?.card ?? project.heroImage.url)
    : null;

  /*
   * Two degrees of lean and five pixels of lift, on a mouse only. The lean is
   * what stops the lift reading as a card being nudged: a surface that also
   * turns very slightly towards the pointer feels like it is being addressed.
   * Anything more than a couple of degrees and it stops being a piece of
   * software.
   */
  const tilt = usePointerTilt<HTMLAnchorElement>({ maxRotateDeg: 2, liftPx: 5 });

  const enter = entering(inView, 'rise', delayMs, 750);

  const category = project.category.trim();
  const isIndex = variant === 'index';

  /*
   * The first few technologies, by their label. `techStack` is a list of marks
   * resolved into the snapshot at publish, and a card shows the words rather
   * than the logos — four of them, so a project with a long stack does not make
   * a card twice the height of the one beside it in the grid.
   */
  const tech = isIndex ? project.techStack.slice(0, TECH_PILLS) : [];
  const overflow = isIndex ? project.techStack.length - tech.length : 0;

  return (
    // Wrapped rather than given the entrance classes directly: the card itself
    // carries the pointer lean, and one element cannot hold two transforms.
    <div style={enter.style} className={`h-full ${enter.className}`}>
      <Link
        ref={tilt.ref}
        style={tilt.style}
        to={`/work/${project.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-surface-deep ease-out-expo hover:border-border-strong hover:shadow-[0_18px_60px_var(--color-accent-glow)]"
      >
        {/*
         * The image band is a fixed slice of the card rather than the picture's
         * own aspect, so a row of cards lines up whatever shape the screenshots
         * are. A project with no hero keeps the band as a lit panel — a card that
         * suddenly starts at its title breaks the row.
         *
         * `overflow-hidden` is what makes the hover crop a crop: the picture
         * grows by three percent inside a band that does not, so the frame
         * closes in on the shot rather than the shot getting bigger.
         *
         * `aria-hidden` and empty alt: the link is named by the heading below it,
         * and a screen reader reading a screenshot's alt text here would announce
         * the project twice.
         */}
        <div className="h-40 w-full shrink-0 overflow-hidden border-b border-border bg-surface-deep">
          {image ? (
            <img
              src={image}
              alt=""
              aria-hidden
              loading="lazy"
              className="size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
            />
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          {/*
           * The category, as a label over the name. It is the same `category`
           * the landing card shows as a chip at its foot — said once per card
           * either way, in the place each layout puts it.
           */}
          {isIndex && category ? (
            <p className="font-heading text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted">
              {category}
            </p>
          ) : null}

          <div className={`flex items-center gap-2.5 ${isIndex && category ? 'mt-1.5' : ''}`}>
            {/*
             * The project's own icon, resolved into the snapshot at publish. A
             * project without one is not drawn as a blank square — the name
             * simply starts the row (§7.4).
             */}
            {project.appIcon?.svg ? (
              <Mark mark={project.appIcon} className="size-6 shrink-0 text-accent" />
            ) : null}

            <h3 className="font-heading text-base font-semibold text-fg">{project.name}</h3>
          </div>

          {project.shortDescription ? (
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">
              {project.shortDescription}
            </p>
          ) : null}

          {!isIndex && category ? (
            <span className="mt-4 inline-flex w-fit rounded border border-border px-2 py-1 font-heading text-[0.625rem] font-medium uppercase tracking-[0.14em] text-accent [transition-property:color,border-color] duration-500 ease-out-expo group-hover:border-border-strong group-hover:text-accent-hover">
              {category}
            </span>
          ) : null}

          {/* The words, not the logos — `techStack` is a list of marks and a card
              names them. The row wraps rather than scrolling: a card is a fixed
              width in the grid and a second line of words is fine. */}
          {isIndex && tech.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {tech.map((mark) => (
                <li
                  key={mark.key}
                  className="rounded-full border border-border bg-surface-deep px-2.5 py-1 text-[0.6875rem] text-muted"
                >
                  {mark.label}
                </li>
              ))}
              {/*
               * A numeral, not a phrase. A card is a taste of the stack and the
               * project page carries all of it, so the rest is counted rather
               * than listed — and counted rather than dropped silently.
               */}
              {overflow > 0 ? (
                <li className="rounded-full border border-border bg-surface-deep px-2.5 py-1 text-[0.6875rem] text-muted">
                  +{overflow}
                </li>
              ) : null}
            </ul>
          ) : null}

          {/*
           * Pushed to the foot with `mt-auto` so it lines up across a row of
           * cards whose blurbs are different lengths. It is an affordance, not
           * a second link — the whole card is the anchor.
           */}
          {isIndex ? (
            <span className="mt-auto inline-flex w-fit items-center gap-1.5 pt-4 font-heading text-sm font-medium text-accent transition-colors duration-300 ease-out-expo group-hover:text-accent-hover">
              View project
              <span
                aria-hidden
                className="transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              >
                ↗
              </span>
            </span>
          ) : null}
        </div>
      </Link>
    </div>
  );
}

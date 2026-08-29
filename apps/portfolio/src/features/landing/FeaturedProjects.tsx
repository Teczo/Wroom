import type { PublishedProject } from '@wroom/shared';
import { Link } from 'react-router-dom';

import { Carousel } from '../../components/Carousel';
import { Mark } from '../../components/Mark';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useFeaturedProjects } from './api';

/**
 * The row of published work under the hero.
 *
 * A carousel at every width: one card per viewport on a phone, swiped, with the
 * arrows hidden and the dots doing the telling (§7.7). At desktop width several
 * cards fit, the row snaps, and the arrows sit on the ends of the track as the
 * design draws them.
 *
 * How many it holds is `featuredLimit` from the published `landing` record, so
 * the length of this row is an edit and a publish rather than a deploy.
 *
 * The line under the heading is `featuredIntro` from the same record. Empty and
 * it is not drawn, rather than leaving a gap where a sentence used to be
 * (§7.4).
 */
function ProjectCard({ project }: { project: PublishedProject }) {
  // The card variant for a card slot — never the original upload (§10).
  const image = project.heroImage
    ? (project.heroImage.variants?.card ?? project.heroImage.url)
    : null;

  return (
    /*
     * The words sit on the card and the screenshot bleeds out of its lower
     * right corner, as the design draws it — one composition rather than a
     * picture with a caption under it. `overflow-hidden` is what makes the
     * bleed a bleed instead of a card that has grown a corner.
     */
    <Link
      to={`/work/${project.slug}`}
      className="group relative flex h-full min-h-56 flex-col overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-surface-deep p-5 transition-[border-color,transform] hover:-translate-y-1 hover:border-border-strong"
    >
      {/*
       * The screenshot, behind the words and off the edge. `aria-hidden` and
       * empty alt: the link is named by the heading above it, and a screen
       * reader reading a screenshot's alt text here would announce the project
       * twice.
       */}
      {image ? (
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          className="pointer-events-none absolute -bottom-6 -right-10 w-3/5 rounded-lg border border-border opacity-70 transition-opacity group-hover:opacity-100"
        />
      ) : null}

      {/*
       * The arrow, in the corner the design puts it. Geometry rather than a
       * mark — there is nothing behind it to look up (§7.3).
       */}
      <span
        aria-hidden
        className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg border border-border bg-canvas/70 font-heading text-sm text-muted transition-colors group-hover:border-accent group-hover:text-accent"
      >
        ↗
      </span>

      <div className="relative flex items-center gap-2.5 pr-10">
        {/*
         * The project's own icon, resolved into the snapshot at publish. A
         * project without one is not drawn as a blank square — the name simply
         * starts the row (§7.4).
         */}
        {project.appIcon?.svg ? (
          <Mark mark={project.appIcon} className="size-6 shrink-0 text-accent" />
        ) : null}

        <h3 className="font-heading text-base font-semibold text-fg">{project.name}</h3>
      </div>

      {project.shortDescription ? (
        <p className="relative mt-2 line-clamp-3 max-w-[62%] text-xs leading-relaxed text-muted">
          {project.shortDescription}
        </p>
      ) : null}

      {project.category ? (
        <span className="relative mt-auto inline-flex w-fit rounded border border-border bg-canvas/70 px-2 py-1 font-heading text-[0.625rem] font-medium uppercase tracking-[0.14em] text-accent">
          {project.category}
        </span>
      ) : null}
    </Link>
  );
}

export function FeaturedProjects({
  limit,
  intro,
  enabled,
}: {
  limit: number;
  intro: string;
  enabled: boolean;
}) {
  const projects = useFeaturedProjects(limit, enabled);

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      {/*
       * The heading and the link to the whole list sit on one line at desktop
       * width and stack on a phone, where a link floated beside a heading is a
       * tap target crowding the thing it belongs to.
       */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2.5 font-heading text-xs font-medium uppercase tracking-[0.18em] text-accent">
            <span aria-hidden className="size-2 rounded-full bg-accent" />
            My work
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Featured Projects
          </h2>

          {intro ? <p className="mt-2 text-sm text-muted">{intro}</p> : null}
        </div>

        <Link
          to="/work"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface/40 px-5 font-heading text-sm font-medium text-fg transition-colors hover:border-accent hover:text-accent sm:w-auto"
        >
          View all projects
          <span aria-hidden>↗</span>
        </Link>
      </div>

      {projects.isPending ? <LoadingState label="Loading work…" /> : null}

      {projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : null}

      {projects.isSuccess && projects.data.items.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          whatToDoNext="Work appears here once it has been published from the portal. Check back shortly."
        />
      ) : null}

      {projects.isSuccess && projects.data.items.length > 0 ? (
        <Carousel
          label="Featured projects"
          className="mt-8"
          controls="side"
          // One card per viewport on a phone; from `sm` up a wider card, three
          // of which fill the row at desktop width as the design draws them.
          slideClassName="w-full sm:w-[21rem]"
        >
          {projects.data.items.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </Carousel>
      ) : null}
    </section>
  );
}

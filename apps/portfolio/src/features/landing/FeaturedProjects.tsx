import type { PublishedProject } from '@wroom/shared';
import { Link } from 'react-router-dom';

import { Carousel } from '../../components/Carousel';
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
    <Link
      to={`/work/${project.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-surface-deep transition-[border-color,transform] hover:-translate-y-1 hover:border-border-strong"
    >
      {/*
       * The image band is a fixed slice of the card rather than the picture's
       * own aspect, so a row of cards lines up whatever shape the screenshots
       * are. A project with no hero keeps the band as a lit panel — a card that
       * suddenly starts at its title breaks the row.
       */}
      <div className="h-40 w-full border-b border-border bg-surface-deep">
        {image ? (
          <img
            src={image}
            alt={project.heroImage?.alt ?? ''}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-base font-semibold text-fg">{project.name}</h3>

        {project.shortDescription ? (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">
            {project.shortDescription}
          </p>
        ) : null}

        {project.category ? (
          <span className="mt-4 inline-flex w-fit rounded border border-border px-2 py-1 font-heading text-[0.625rem] font-medium uppercase tracking-[0.14em] text-accent">
            {project.category}
          </span>
        ) : null}
      </div>
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
      <h2 className="font-heading text-xl font-semibold text-accent">Featured Projects</h2>
      {intro ? <p className="mt-1 text-sm text-muted">{intro}</p> : null}

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
          className="mt-6"
          controls="side"
          // One card per viewport on a phone; the design's 270px card from md
          // up, where three or four of them fill the row.
          slideClassName="w-full md:w-[17rem]"
        >
          {projects.data.items.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </Carousel>
      ) : null}
    </section>
  );
}

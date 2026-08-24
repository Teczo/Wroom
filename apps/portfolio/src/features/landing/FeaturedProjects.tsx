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
 * cards fit and the row snaps.
 *
 * How many it holds is `featuredLimit` from the published `landing` record, so
 * the length of this row is an edit and a publish rather than a deploy.
 */
function ProjectCard({ project }: { project: PublishedProject }) {
  // The card variant for a card slot — never the original upload (§10).
  const image = project.heroImage
    ? (project.heroImage.variants?.card ?? project.heroImage.url)
    : null;

  return (
    <Link
      to={`/work/${project.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent"
    >
      {image ? (
        <img
          src={image}
          alt={project.heroImage?.alt ?? ''}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        {project.productName ? (
          <p className="text-xs uppercase tracking-wide text-muted">{project.productName}</p>
      ) : null}
        <h3 className="mt-1 font-heading text-lg font-semibold text-fg">{project.name}</h3>
        {project.shortDescription ? (
          <p className="mt-2 line-clamp-3 text-sm text-muted">{project.shortDescription}</p>
      ) : null}
      </div>
    </Link>
  );
}

export function FeaturedProjects({ limit, enabled }: { limit: number; enabled: boolean }) {
  const projects = useFeaturedProjects(limit, enabled);

  return (
    <section className="mx-auto max-w-5xl px-5 pb-20">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Featured work</h2>

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
          label="Featured work"
          className="mt-6"
          // Two of these fit the column at desktop and three do not, which is
          // what decides whether the row has anywhere to scroll.
          slideClassName="w-full md:w-[21rem]"
        >
          {projects.data.items.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </Carousel>
      ) : null}
    </section>
  );
}

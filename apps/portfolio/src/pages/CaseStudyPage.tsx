import type { PublishedProject } from '@wroom/shared';
import { Link, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { usePublishedProject } from '../features/work/api';
import {
  CaseStudies,
  ContactCta,
  DemoAndModules,
  MarkGrid,
  MetricAndTestimonial,
} from '../features/work/sections';
import { ApiRequestError } from '../lib/api';

/**
 * A project's public page.
 *
 * Everything below the hero is optional and hides when the snapshot has
 * nothing for it (§7.4) — the sections themselves live in
 * `features/work/sections.tsx`.
 *
 * The case studies are cards on a carousel rather than a narrative here. Each
 * one's problem, role, approach and outcome belong to its own page at
 * /work/:projectSlug/case/:caseSlug, and that route is deferred — which is why
 * the card's button is present and disabled.
 */
function ProjectPage({ project }: { project: PublishedProject }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      <Link to="/work" className="text-sm text-muted hover:text-fg">
        ← All work
      </Link>

      <header className="mt-8">
        <p className="text-xs uppercase tracking-wide text-muted">{project.productName}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {project.name}
        </h1>
        {project.shortDescription ? (
          <p className="mt-3 text-lg text-muted">{project.shortDescription}</p>
        ) : null}

        {project.liveUrl ? (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-accent px-5 font-heading text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Visit the live site
          </a>
        ) : null}
      </header>

      {project.heroImage ? (
        <img
          src={project.heroImage.variants?.hero ?? project.heroImage.url}
          alt={project.heroImage.alt}
          className="mt-10 w-full rounded-2xl border border-border object-cover"
        />
      ) : null}

      <DemoAndModules project={project} />
      <MetricAndTestimonial project={project} />

      {project.gallery.length > 0 ? (
        <section className="mt-14 border-t border-border pt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Gallery</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {project.gallery.map((item) => (
              <figure key={item.url}>
                {/*
                 * The snapshot carries an alt per gallery item now. Where it is
                 * empty, empty it stays: the caption sits next to the image as
                 * real text, and copying it into alt would have a screen reader
                 * read it twice. Empty alt marks it decorative, which is honest.
                 */}
                <img
                  src={item.variants?.card ?? item.url}
                  alt={item.alt}
                  loading="lazy"
                  className="w-full rounded-xl border border-border object-cover"
                />
                {item.caption ? (
                  <figcaption className="mt-2 text-xs text-muted">
                    {item.caption}
                    {item.device ? ` · ${item.device}` : ''}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <CaseStudies studies={project.caseStudies} />

      <MarkGrid heading="Built with" marks={project.techStack} />
      <MarkGrid heading="Platforms" marks={project.platforms} />

      <ContactCta projectId={project.projectId} />
    </article>
  );
}

export function CaseStudyPage() {
  const { slug = '' } = useParams();
  const project = usePublishedProject(slug);

  if (project.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-5">
        <LoadingState />
      </div>
    );
  }

  if (project.isError) {
    const isMissing = project.error instanceof ApiRequestError && project.error.status === 404;

    return (
      <div className="mx-auto max-w-3xl px-5">
        {isMissing ? (
          <>
            <EmptyState
              title="That project is not here"
              whatToDoNext="It may not be published, or the link may be out of date. Browse the published work instead."
            />
            <div className="pb-16 text-center">
              <Link to="/work" className="text-sm font-medium text-fg underline">
                See all work
              </Link>
            </div>
          </>
        ) : (
          <ErrorState error={project.error} onRetry={() => void project.refetch()} />
        )}
      </div>
    );
  }

  return <ProjectPage project={project.data} />;
}

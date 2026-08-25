import type { PublishedCaseStudy, PublishedProject } from '@wroom/shared';
import { Link, useParams } from 'react-router-dom';

import { Panel, panelClass } from '../components/Panel';
import { Eyebrow } from '../components/SectionHeading';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { usePublishedProject } from '../features/work/api';
import { ContactCta } from '../features/work/sections';
import { ApiRequestError } from '../lib/api';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * One case study — `/work/:slug/case/:caseSlug`.
 *
 * A case study belongs to a project and its slug is unique within that project
 * rather than globally, which is why the project's slug is the first half of
 * the address (docs/DATA_MODEL.md, resolved decision 7).
 *
 * There is no separate request for this page and there is no route for one:
 * `GET /public/projects/:slug` already carries every case study whole, so the
 * study is found in the project's own payload. TanStack Query has usually
 * cached it from the project page the visitor arrived from, which makes the
 * common path free — and adding a fifth `/public` route to avoid re-reading a
 * document we already have would be a ticket for no gain (§6).
 *
 * The narrative fields are plain strings, not markdown — `whitespace-pre-line`
 * keeps the paragraph breaks that were typed in the portal without treating
 * anything else in them as markup.
 */

const containerClass = 'mx-auto w-full max-w-3xl px-5';

/** One narrative block. Absent when nothing was written for it (§7.4). */
function Narrative({ heading, body }: { heading: string; body: string }) {
  if (!body.trim()) return null;

  return (
    <section className="border-t border-border pt-8">
      <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-accent">
        {heading}
      </h2>
      <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-muted">{body}</p>
    </section>
  );
}

function CaseStudyView({
  study,
  project,
}: {
  study: PublishedCaseStudy;
  project: PublishedProject;
}) {
  useDocumentMeta(`${study.title} — ${project.name}`, study.summary);

  const hero = study.hero ? (study.hero.variants?.hero ?? study.hero.url) : null;
  const metrics = study.metrics.filter((metric) => metric.value.trim() || metric.label.trim());

  return (
    <article className={containerClass}>
      <header className="pt-8 sm:pt-12">
        <Link
          to={`/work/${project.slug}`}
          className="text-sm text-muted transition-colors hover:text-accent"
        >
          ← Back to {project.name}
        </Link>

        {study.sector ? (
          <div className="mt-8">
            <Eyebrow>{study.sector}</Eyebrow>
          </div>
        ) : null}

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-fg sm:text-5xl">
          {study.title}
        </h1>

        {study.summary ? (
          <p className="mt-5 text-lg leading-relaxed text-muted">{study.summary}</p>
        ) : null}
      </header>

      {hero ? (
        /* Full-bleed on a phone, framed from `sm` up — the same treatment the
           project page gives its hero (§7.7). */
        <img
          src={hero}
          alt={study.hero?.alt ?? ''}
          className="-mx-5 mt-10 w-full border-y border-border object-cover sm:mx-0 sm:rounded-2xl sm:border"
        />
      ) : null}

      {metrics.length > 0 ? (
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <li key={`${metric.label}-${metric.value}`} className={`${panelClass} p-5 text-center`}>
              {/* Space Grotesk for numerals in a metric callout (§7.2). */}
              <p className="font-heading text-2xl font-semibold tracking-tight text-accent">
                {metric.value}
              </p>
              {metric.label ? <p className="mt-1 text-xs text-muted">{metric.label}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-12 space-y-8">
        <Narrative heading="The problem" body={study.problem} />
        <Narrative heading="My role" body={study.role} />
        <Narrative heading="Approach" body={study.approach} />
        <Narrative heading="Outcome" body={study.outcome} />
      </div>

      {study.testimonial ? (
        <Panel className="mt-12 p-7">
          <figure>
            <blockquote className="text-base leading-relaxed text-fg">
              “{study.testimonial.quote}”
            </blockquote>
            {study.testimonial.attribution ? (
              <figcaption className="mt-4 text-sm text-muted">
                — {study.testimonial.attribution}
              </figcaption>
            ) : null}
          </figure>
        </Panel>
      ) : null}

      <div className="mt-12">
        <ContactCta projectId={project.projectId} />
      </div>
    </article>
  );
}

export function CaseStudyPage() {
  const { slug = '', caseSlug = '' } = useParams();
  const project = usePublishedProject(slug);

  if (project.isPending) {
    return (
      <div className={containerClass}>
        <LoadingState />
      </div>
    );
  }

  if (project.isError) {
    const isMissing = project.error instanceof ApiRequestError && project.error.status === 404;

    return (
      <div className={containerClass}>
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

  const study = project.data.caseStudies.find((entry) => entry.slug === caseSlug);

  // The project published, this study did not — an unpublished study, a
  // renamed slug, or a stale link. The project itself is right there, so say so
  // and point at it rather than at the work index.
  if (!study) {
    return (
      <div className={containerClass}>
        <EmptyState
          title="That case study is not here"
          whatToDoNext={`It may have been renamed or taken down. The rest of ${project.data.name} is still published.`}
        />
        <div className="pb-16 text-center">
          <Link to={`/work/${slug}`} className="text-sm font-medium text-fg underline">
            Back to {project.data.name}
          </Link>
        </div>
      </div>
    );
  }

  return <CaseStudyView study={study} project={project.data} />;
}

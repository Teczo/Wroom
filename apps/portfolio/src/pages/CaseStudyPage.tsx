import type { PublishedProject } from '@wroom/shared';
import { Link, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { usePublishedProject } from '../features/work/api';
import { ApiRequestError } from '../lib/api';

function Section({ heading, body }: { heading: string; body: string }) {
  if (!body) return null;

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{heading}</h2>
      <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-slate-700">{body}</p>
    </section>
  );
}

function CaseStudy({ project }: { project: PublishedProject }) {
  const { caseStudy } = project;

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      <Link to="/work" className="text-sm text-slate-500 hover:text-slate-900">
        ← All work
      </Link>

      <header className="mt-8">
        <p className="text-xs uppercase tracking-wide text-slate-500">{project.productName}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {project.name}
        </h1>
        {project.shortDescription ? (
          <p className="mt-3 text-lg text-slate-600">{project.shortDescription}</p>
        ) : null}

        {project.liveUrl ? (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Visit the live site
          </a>
        ) : null}
      </header>

      {project.heroImage ? (
        <img
          src={project.heroImage.url}
          alt={project.heroImage.alt}
          className="mt-10 w-full rounded-2xl border border-slate-200 object-cover"
        />
      ) : null}

      <Section heading="The problem" body={caseStudy.problem} />
      <Section heading="My role" body={caseStudy.role} />
      <Section heading="Approach" body={caseStudy.approach} />
      <Section heading="Outcome" body={caseStudy.outcome} />

      {caseStudy.metrics.length > 0 ? (
        <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {caseStudy.metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-200 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {caseStudy.testimonial ? (
        <blockquote className="mt-10 border-l-2 border-slate-900 pl-5">
          <p className="text-lg italic text-slate-800">“{caseStudy.testimonial.quote}”</p>
          <footer className="mt-2 text-sm text-slate-500">
            — {caseStudy.testimonial.attribution}
          </footer>
        </blockquote>
      ) : null}

      {project.gallery.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gallery</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {project.gallery.map((item) => (
              <figure key={item.url}>
                <img
                  src={item.thumbnailUrl ?? item.url}
                  alt={item.caption}
                  loading="lazy"
                  className="w-full rounded-xl border border-slate-200 object-cover"
                />
                {item.caption ? (
                  <figcaption className="mt-2 text-xs text-slate-500">
                    {item.caption}
                    {item.device ? ` · ${item.device}` : ''}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {project.techStack.length > 0 ? (
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Built with</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.techStack.map((entry) => (
              <li
                key={entry}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {entry}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
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
              <Link to="/work" className="text-sm font-medium text-slate-900 underline">
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

  return <CaseStudy project={project.data} />;
}

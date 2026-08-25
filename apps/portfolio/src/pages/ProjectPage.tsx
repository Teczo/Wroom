import type { PublishedProject } from '@wroom/shared';
import { Link, useParams } from 'react-router-dom';

import { buttonClasses } from '../components/Button';
import { Eyebrow } from '../components/SectionHeading';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { usePublishedProject } from '../features/work/api';
import { HeroViewer } from '../features/work/HeroViewer';
import {
  CaseStudies,
  ContactCta,
  DemoAndModules,
  FeatureCards,
  MarkPanels,
} from '../features/work/sections';
import { ApiRequestError } from '../lib/api';

/**
 * A project's public page — the address behind `/work/:slug`.
 *
 * Everything below the hero is optional and hides when the snapshot has
 * nothing for it (§7.4); the sections themselves live in
 * `features/work/sections.tsx`.
 *
 * Nothing above the fold animates. A hero that fades in is a hero that
 * measures as slower than one that does not (§7.5), so `Reveal` starts at the
 * capabilities grid and never wraps this header.
 */

const containerClass = 'mx-auto w-full max-w-6xl px-5';

/**
 * The project's name, with its last word in the accent.
 *
 * There is no field saying which part of a name is accented, and there does
 * not need to be: the design reference lights the trailing token —
 * "FusionSite **360XR**" — which is a presentation rule, not content. A
 * single-word name is left alone rather than being turned entirely green.
 */
function AccentedName({ name }: { name: string }) {
  const trimmed = name.trim();
  const cut = trimmed.lastIndexOf(' ');

  if (cut <= 0) return <>{trimmed}</>;

  return (
    <>
      {trimmed.slice(0, cut)} <span className="text-accent">{trimmed.slice(cut + 1)}</span>
    </>
  );
}

function ProjectHeader({ project }: { project: PublishedProject }) {
  const hasCaseStudies = project.caseStudies.length > 0;
  const blurb = project.overview.trim() || project.shortDescription.trim();

  return (
    <section className="pt-8 sm:pt-12">
      <Link to="/work" className="text-sm text-muted transition-colors hover:text-accent">
        ← Back to work
      </Link>

      {/*
       * The copy column is the narrower of the two, so the viewer beside it
       * reads as the subject of the page. Below `md` they stack and the copy
       * comes first (§7.7).
       */}
      <div className="mt-8 grid items-center gap-10 md:grid-cols-[0.85fr_1.5fr] md:gap-12">
        <div>
          {project.category ? <Eyebrow>{project.category}</Eyebrow> : null}

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-fg sm:text-5xl lg:text-6xl">
            <AccentedName name={project.name} />
          </h1>

          {project.tagline ? (
            <p className="mt-4 font-heading text-xl font-medium text-fg/90 sm:text-2xl">
              {project.tagline}
            </p>
          ) : null}

          {/*
           * The overview is the portfolio paragraph, written on the Portfolio
           * tab. `shortDescription` is the project's own one-liner, written on
           * the project itself and already snapshotted — so a project whose
           * portfolio copy has not been filled in yet still says what it is,
           * rather than showing a bare title. Both are authored; neither is
           * invented here.
           */}
          {blurb ? (
            <p className="mt-5 max-w-prose text-base leading-relaxed text-muted">{blurb}</p>
          ) : null}

          {project.liveUrl || hasCaseStudies ? (
            /* Full width and stacked at 390px (§7.7). */
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {project.liveUrl ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClasses('primary')}
                >
                  Visit platform →
                </a>
              ) : null}

              {hasCaseStudies ? (
                <a href="#case-studies" className={buttonClasses('secondary')}>
                  View case studies ↓
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <HeroViewer hero={project.heroImage} gallery={project.gallery} name={project.name} />
      </div>
    </section>
  );
}

function ProjectView({ project }: { project: PublishedProject }) {
  return (
    <article className={containerClass}>
      <ProjectHeader project={project} />
      <FeatureCards cards={project.featureCards} />
      <DemoAndModules project={project} />
      <CaseStudies studies={project.caseStudies} projectSlug={project.slug} />
      <MarkPanels project={project} />
      <ContactCta projectId={project.projectId} />
    </article>
  );
}

export function ProjectPage() {
  const { slug = '' } = useParams();
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

  return <ProjectView project={project.data} />;
}

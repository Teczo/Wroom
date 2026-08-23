import type {
  PublishedCaseStudy,
  PublishedKeyModule,
  PublishedMark,
  PublishedProject,
} from '@wroom/shared';
import { Link } from 'react-router-dom';

import { Carousel } from '../../components/Carousel';
import { usePublishedContent } from '../content/api';
import { DemoVideo } from './DemoVideo';

/**
 * The body of a project page, below the header and the hero.
 *
 * Every section here is optional and every one of them disappears entirely —
 * heading included — when the snapshot has nothing to put in it (§7.4). A
 * public visitor is not waiting for data to arrive; the section simply is not
 * part of that project.
 *
 * Nothing on this page is written in this repo. Every string, mark and image
 * comes from the published snapshot or from `siteContent` (§2, rule 8).
 */

const headingClass = 'text-sm font-semibold uppercase tracking-wide text-muted';

/** The modules list. Beside the video from `md` up, under it on a phone. */
function KeyModules({ modules }: { modules: PublishedKeyModule[] }) {
  return (
    <div>
      <h2 className={headingClass}>Key modules</h2>
      <ul className="mt-4 space-y-4">
        {modules.map((module) => (
          <li key={module.title} className="border-l-2 border-accent pl-4">
            <h3 className="font-heading text-base font-medium text-fg">{module.title}</h3>
            {module.body ? <p className="mt-1 text-sm text-muted">{module.body}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The video and the modules, which share a row at desktop width.
 *
 * They are one section because they are one row, but they hide independently:
 * a project with modules and no video gets the full width for the list, and a
 * project with a video and no modules gets it for the video.
 */
export function DemoAndModules({ project }: { project: PublishedProject }) {
  const hasModules = project.keyModules.length > 0;
  const video = project.demoVideo;

  if (!video && !hasModules) return null;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <div className={video && hasModules ? 'grid gap-8 md:grid-cols-5' : ''}>
        {video ? (
          <div className={video && hasModules ? 'md:col-span-3' : ''}>
            <DemoVideo video={video} title={project.name} />
          </div>
        ) : null}

        {hasModules ? (
          <div className={video ? 'md:col-span-2' : ''}>
            <KeyModules modules={project.keyModules} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The single big number and the quote. Full width under the modules (§7.7),
 * sharing a row from `md` up when the project has both.
 */
export function MetricAndTestimonial({ project }: { project: PublishedProject }) {
  const metric = project.headlineMetric;
  const testimonial = project.testimonial;

  if (!metric && !testimonial) return null;

  return (
    <section className="mt-14">
      <div className={metric && testimonial ? 'grid gap-5 md:grid-cols-3' : ''}>
        {metric ? (
          <div className="flex flex-col justify-center rounded-2xl border border-border bg-surface p-6 text-center">
            {/* Space Grotesk for numerals in a metric callout (§7.2). */}
            <p className="font-heading text-4xl font-bold tracking-tight text-accent sm:text-5xl">
              {metric.value}
            </p>
            {metric.label ? <p className="mt-2 text-sm text-muted">{metric.label}</p> : null}
          </div>
        ) : null}

        {testimonial ? (
          <figure
            className={`rounded-2xl border border-border bg-surface p-6 ${
              metric ? 'md:col-span-2' : ''
            }`}
          >
            <blockquote className="text-base italic leading-relaxed text-fg">
              “{testimonial.quote}”
            </blockquote>
            {testimonial.attribution ? (
              <figcaption className="mt-3 text-sm text-muted">
                — {testimonial.attribution}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>
    </section>
  );
}

/**
 * One case study card.
 *
 * The button is deliberately present and deliberately dead: the
 * `/work/:projectSlug/case/:caseSlug` route is deferred (docs/DATA_MODEL.md),
 * and a card that says nothing about where its story lives reads as an
 * oversight. A real `disabled` attribute rather than a styled-off link, so it
 * is skipped by the keyboard rather than focused and then doing nothing.
 */
function CaseStudyCard({ study }: { study: PublishedCaseStudy }) {
  const hero = study.hero ? (study.hero.variants?.card ?? study.hero.url) : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      {hero ? (
        <img
          src={hero}
          alt={study.hero?.alt ?? ''}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        {study.sector ? (
          <p className="text-xs uppercase tracking-wide text-accent">{study.sector}</p>
        ) : null}
        <h3 className="mt-1 font-heading text-lg font-semibold text-fg">{study.title}</h3>
        {study.summary ? <p className="mt-2 text-sm text-muted">{study.summary}</p> : null}

        <button
          type="button"
          disabled
          className="mt-5 min-h-11 w-full cursor-not-allowed rounded-lg border border-border px-4 font-heading text-sm font-medium text-muted opacity-60"
        >
          Read case study
        </button>
      </div>
    </article>
  );
}

/**
 * The case studies row. A carousel at every width: one card per viewport on a
 * phone, swiped (§7.7), and a snapping row at desktop where two fit and
 * nothing needs an arrow.
 */
export function CaseStudies({ studies }: { studies: PublishedCaseStudy[] }) {
  if (studies.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className={headingClass}>Case studies</h2>
      <Carousel
        label="Case studies"
        className="mt-6"
        // Two of these fit the column at desktop, three do not — which is what
        // decides whether the carousel has anywhere to scroll.
        slideClassName="w-full md:w-[21rem]"
      >
        {studies.map((study) => (
          <CaseStudyCard key={study.slug} study={study} />
        ))}
      </Carousel>
    </section>
  );
}

/**
 * A grid of marks. Three per row at 390px (§7.7).
 *
 * `svg` is inline markup from `mediaLibrary`, sanitised by the API on write
 * and resolved into the snapshot at publish. This is the one API in either app
 * permitted to render markup, and only because that write-time gate exists
 * (§7.3). It draws with `currentColor`, so the colour comes from the token on
 * the wrapper rather than from the file.
 */
export function MarkGrid({ heading, marks }: { heading: string; marks: PublishedMark[] }) {
  if (marks.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className={headingClass}>{heading}</h2>
      <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
        {marks.map((mark) => (
          <li
            key={mark.key}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4 text-center"
          >
            {mark.svg ? (
              <span
                aria-hidden
                className="size-8 text-muted [&_svg]:size-full"
                dangerouslySetInnerHTML={{ __html: mark.svg }}
              />
            ) : null}
            <span className="text-xs font-medium text-fg">{mark.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The call to action at the foot of a project page.
 *
 * The label is the site's own CTA, from the published `landing` record, so
 * changing the words is an edit and a publish rather than a deploy (§13.6).
 * There is no field behind a heading or a supporting line for this section, so
 * there is no heading and no supporting line — inventing the copy to match a
 * mockup is what §2 rule 8 forbids.
 *
 * The project rides along in the query string, so an enquiry sent from here
 * records which project prompted it.
 */
export function ContactCta({ projectId }: { projectId: string }) {
  const landing = usePublishedContent('landing');

  const data = landing.data?.data as Record<string, unknown> | undefined;
  const label = typeof data?.ctaLabel === 'string' ? data.ctaLabel.trim() : '';

  // Nothing published, still loading, or no label authored: no section. The
  // page's own "Visit the live site" and the site nav are still there.
  if (!label) return null;

  return (
    <section className="mt-16 border-t border-border pt-10 text-center">
      <Link
        to={`/contact?project=${projectId}`}
        className="flex min-h-12 w-full items-center justify-center rounded-lg bg-accent px-6 font-heading text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover sm:inline-flex sm:w-auto"
      >
        {label}
      </Link>
    </section>
  );
}

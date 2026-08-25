import type {
  PublishedCaseStudy,
  PublishedFeatureCard,
  PublishedKeyModule,
  PublishedMark,
  PublishedProject,
} from '@wroom/shared';
import { Link } from 'react-router-dom';

import { buttonClasses } from '../../components/Button';
import { Carousel } from '../../components/Carousel';
import { Panel, panelClass } from '../../components/Panel';
import { Reveal } from '../../components/Reveal';
import { SectionHeading } from '../../components/SectionHeading';
import { usePublishedContent } from '../content/api';
import { DemoVideo } from './DemoVideo';

/**
 * The body of a project page, below the hero.
 *
 * Every section here is optional and every one of them disappears entirely —
 * heading included — when the snapshot has nothing to put in it (§7.4). A
 * public visitor is not waiting for data to arrive; the section simply is not
 * part of that project.
 *
 * Nothing on this page is written in this repo. Every string, mark and image
 * comes from the published snapshot or from `siteContent` (§2, rule 8).
 */

const sectionClass = 'py-14 sm:py-20';

/**
 * A feature card: a mark from the library in a lit tile, a title and a line.
 *
 * A card whose `iconKey` names nothing in `mediaLibrary`, or names a mark that
 * is not `usageApproved`, arrives here with `icon: null` — the publish action
 * drops it silently rather than failing. The tile goes with it rather than
 * being rendered empty.
 */
function FeatureCard({ card }: { card: PublishedFeatureCard }) {
  return (
    <article className={`${panelClass} flex h-full flex-col p-6`}>
      {card.icon ? (
        <span
          aria-hidden
          className="mb-6 flex size-11 items-center justify-center rounded-lg border border-border-strong text-accent [&_svg]:size-6"
          dangerouslySetInnerHTML={{ __html: card.icon.svg }}
        />
      ) : null}

      <h3 className="font-heading text-base font-semibold text-fg">{card.title}</h3>
      {card.body ? <p className="mt-2.5 text-sm leading-relaxed text-muted">{card.body}</p> : null}
    </article>
  );
}

/**
 * The capabilities grid.
 *
 * The column count follows the card count rather than being fixed at the five
 * of the design reference: four cards in a five-column grid leave a hole, and
 * six would wrap one card onto a row of its own. Single column at 390px (§7.7).
 */
export function FeatureCards({ cards }: { cards: PublishedFeatureCard[] }) {
  if (cards.length === 0) return null;

  const columns =
    cards.length >= 5
      ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      : cards.length === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : cards.length === 3
          ? 'sm:grid-cols-2 lg:grid-cols-3'
          : 'sm:grid-cols-2';

  return (
    <section className={sectionClass}>
      {/* The one written heading on this page, and only because
          docs/DATA_MODEL.md names it as the heading for `featureCards`. */}
      <SectionHeading eyebrow="Capabilities" title="Built for Complex Projects" />

      <Reveal className={`mt-9 grid gap-3 ${columns}`}>
        {cards.map((card) => (
          <FeatureCard key={card.title} card={card} />
        ))}
      </Reveal>
    </section>
  );
}

/** The modules list, as bottom-ruled rows. */
function KeyModules({ modules }: { modules: PublishedKeyModule[] }) {
  return (
    <div>
      <h3 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-muted">
        Key modules
      </h3>
      <ul className="mt-2">
        {modules.map((module) => (
          <li key={module.title} className="border-b border-border py-4 last:border-0">
            <p className="font-heading text-sm font-medium text-accent">{module.title}</p>
            {module.body ? <p className="mt-1 text-sm text-muted">{module.body}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The single big number and the quote, in one card.
 *
 * The design reference draws them as one block — the metric heading a
 * testimonial that backs it up — but they are two independent optional fields,
 * so either half can be missing and the card still makes sense. Both missing
 * and there is no card.
 */
export function MetricAndTestimonial({ project }: { project: PublishedProject }) {
  const metric = project.headlineMetric;
  const testimonial = project.testimonial;

  if (!metric && !testimonial) return null;

  return (
    <figure className="rounded-2xl border border-border bg-accent-soft p-7">
      {metric ? (
        <>
          {/* Space Grotesk for numerals in a metric callout (§7.2). */}
          <p className="font-heading text-4xl font-semibold tracking-tight text-accent">
            {metric.value}
          </p>
          {metric.label ? (
            <p className="mt-1 font-heading text-sm font-semibold text-fg">{metric.label}</p>
          ) : null}
        </>
      ) : null}

      {testimonial ? (
        <>
          <blockquote className={`text-sm leading-relaxed text-muted ${metric ? 'mt-3' : ''}`}>
            “{testimonial.quote}”
          </blockquote>
          {testimonial.attribution ? (
            <figcaption className="mt-4 text-sm text-fg">— {testimonial.attribution}</figcaption>
          ) : null}
        </>
      ) : null}
    </figure>
  );
}

/**
 * The video and the column beside it, which holds the modules and the metric.
 *
 * They are one row at desktop and one stack on a phone, video first (§7.7).
 * Each part hides on its own: a project with modules and no video gives the
 * list the full width, and a project with a video and nothing beside it gives
 * the video the whole row.
 */
export function DemoAndModules({ project }: { project: PublishedProject }) {
  const hasModules = project.keyModules.length > 0;
  const hasAside = hasModules || Boolean(project.headlineMetric) || Boolean(project.testimonial);
  const video = project.demoVideo;

  if (!video && !hasAside) return null;

  return (
    <section className={sectionClass}>
      <SectionHeading eyebrow="Product experience" />

      <Reveal className={`mt-9 ${video && hasAside ? 'grid gap-8 md:grid-cols-5' : ''}`}>
        {video ? (
          <div className={video && hasAside ? 'md:col-span-3' : ''}>
            <DemoVideo video={video} title={project.name} />
          </div>
        ) : null}

        {hasAside ? (
          <div className={`space-y-6 ${video ? 'md:col-span-2' : ''}`}>
            {hasModules ? <KeyModules modules={project.keyModules} /> : null}
            <MetricAndTestimonial project={project} />
          </div>
        ) : null}
      </Reveal>
    </section>
  );
}

/**
 * One case study card. Its link goes to the study's own page under this
 * project — `caseStudies[].slug` is unique within a project, not globally,
 * which is why the project's slug is part of the address.
 */
function CaseStudyCard({ study, projectSlug }: { study: PublishedCaseStudy; projectSlug: string }) {
  const hero = study.hero ? (study.hero.variants?.card ?? study.hero.url) : null;

  return (
    <article className={`${panelClass} flex h-full flex-col overflow-hidden`}>
      {hero ? (
        <img
          src={hero}
          alt={study.hero?.alt ?? ''}
          loading="lazy"
          className="aspect-video w-full border-b border-border object-cover"
        />
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        {study.sector ? (
          <p className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-accent">
            {study.sector}
          </p>
        ) : null}
        <h3 className="mt-2 font-heading text-xl font-semibold text-fg">{study.title}</h3>
        {study.summary ? <p className="mt-2 text-sm text-muted">{study.summary}</p> : null}

        {/*
         * `mt-auto` pushes the button to the foot of the card. Case studies
         * differ in whether they have a picture and in how long the blurb is,
         * and without this the buttons in a row sit at four different heights.
         */}
        <Link
          to={`/work/${projectSlug}/case/${study.slug}`}
          className={buttonClasses('secondary', 'mt-auto w-full pt-0.5')}
        >
          Read case study →
        </Link>
      </div>
    </article>
  );
}

/**
 * The case studies row. A carousel at every width: one card per viewport on a
 * phone, swiped (§7.7), and a snapping row at desktop where several fit and
 * the arrows are not rendered at all.
 */
export function CaseStudies({
  studies,
  projectSlug,
}: {
  studies: PublishedCaseStudy[];
  projectSlug: string;
}) {
  if (studies.length === 0) return null;

  return (
    <section className={sectionClass} id="case-studies">
      <SectionHeading eyebrow="Case studies" />

      <Reveal className="mt-9">
        <Carousel label="Case studies" slideClassName="w-full sm:w-[22rem]">
          {studies.map((study) => (
            <CaseStudyCard key={study.slug} study={study} projectSlug={projectSlug} />
          ))}
        </Carousel>
      </Reveal>
    </section>
  );
}

/**
 * A panel of marks — the tech stack, or the platforms it runs on.
 *
 * `svg` is inline markup from `mediaLibrary`, sanitised by the API on write
 * and resolved into the snapshot at publish. This is the one API in either app
 * permitted to render markup, and only because that write-time gate exists
 * (§7.3). It draws with `currentColor`, so the colour comes from the token on
 * the wrapper rather than from the file.
 */
function MarkPanel({ heading, marks }: { heading: string; marks: PublishedMark[] }) {
  return (
    <Panel className="p-6">
      <h2 className="font-heading text-xl font-semibold text-fg">{heading}</h2>

      {/* Three per row at 390px (§7.7). */}
      <ul className="mt-6 grid grid-cols-3 gap-3">
        {marks.map((mark) => (
          <li
            key={mark.key}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border px-2 py-4 text-center"
          >
            {mark.svg ? (
              <span
                aria-hidden
                className="size-7 text-accent [&_svg]:size-full"
                dangerouslySetInnerHTML={{ __html: mark.svg }}
              />
            ) : null}
            <span className="text-xs text-fg">{mark.label}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The two reference panels. Either can be absent; one alone takes the row. */
export function MarkPanels({ project }: { project: PublishedProject }) {
  const hasTech = project.techStack.length > 0;
  const hasPlatforms = project.platforms.length > 0;

  if (!hasTech && !hasPlatforms) return null;

  return (
    <section className={sectionClass}>
      <Reveal className={hasTech && hasPlatforms ? 'grid gap-4 lg:grid-cols-2' : ''}>
        {hasTech ? <MarkPanel heading="Technology stack" marks={project.techStack} /> : null}
        {hasPlatforms ? <MarkPanel heading="Platforms" marks={project.platforms} /> : null}
      </Reveal>
    </section>
  );
}

/**
 * The call to action at the foot of a project page.
 *
 * Every word here is managed content. The heading and the supporting line are
 * the published `contact` record's own `headline` and `intro`; the button is
 * the `landing` record's `ctaLabel`. Changing any of them is an edit and a
 * publish rather than a deploy (§13.6), and none of it is written here.
 *
 * The button is the section: without a label there is nothing to press, so
 * there is no section. The heading and the line are each optional on top of it.
 *
 * The project rides along in the query string, so an enquiry sent from here
 * records which project prompted it.
 */
export function ContactCta({ projectId }: { projectId: string }) {
  const landing = usePublishedContent('landing');
  const contact = usePublishedContent('contact');

  const landingData = landing.data?.data as Record<string, unknown> | undefined;
  const contactData = contact.data?.data as Record<string, unknown> | undefined;

  const read = (data: Record<string, unknown> | undefined, key: string): string =>
    typeof data?.[key] === 'string' ? (data[key] as string).trim() : '';

  const label = read(landingData, 'ctaLabel');
  const headline = read(contactData, 'headline');
  const intro = read(contactData, 'intro');

  // Nothing published, still loading, or no label authored: no section. The
  // page's own "Visit platform" and the site nav are still there.
  if (!label) return null;

  return (
    <section className="pb-16 sm:pb-24">
      <Reveal>
        <Panel className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          {headline || intro ? (
            <div>
              {headline ? (
                <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                  {headline}
                </h2>
              ) : null}
              {intro ? <p className="mt-2 text-sm text-muted">{intro}</p> : null}
            </div>
          ) : null}

          <Link
            to={`/contact?project=${projectId}`}
            className={buttonClasses('primary', 'w-full shrink-0 sm:w-auto')}
          >
            {label} →
          </Link>
        </Panel>
      </Reveal>
    </section>
  );
}

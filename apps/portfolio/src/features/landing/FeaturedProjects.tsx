import { Link } from 'react-router-dom';

import { Carousel } from '../../components/Carousel';
import { TextReveal } from '../../components/TextReveal';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { entering } from '../../lib/entrance';
import { useInView } from '../../lib/useInView';
import { ProjectCard } from '../work/ProjectCard';
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
 *
 * ## What moves
 *
 * This is the section the page is built towards, so it is the one with the most
 * choreography: the label, then the heading uncovering itself, then the line
 * under it, then the link to the whole index arriving from the right, then the
 * cards one after another (§10). One observer on the section drives all of it,
 * so the order is a list of delays rather than a chain of triggers that can
 * fire out of sequence.
 *
 * A hundred milliseconds between cards. Fewer and the row appears at once;
 * more and a visitor is waiting for the last one.
 */

/** Held between one card and the next. */
const CARD_STEP_MS = 100;

const ENTER = {
  label: 0,
  heading: 90,
  intro: 220,
  viewAll: 260,
  firstCard: 300,
} as const;

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
  const { ref, inView } = useInView<HTMLElement>();

  const labelEnter = entering(inView, 'up', ENTER.label, 600);
  const introEnter = entering(inView, 'up', ENTER.intro, 650);
  const viewAllEnter = entering(inView, 'right', ENTER.viewAll, 700);

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-5 pb-20">
      {/*
       * The heading and the link to the whole list sit on one line at every
       * width, the link aligned to the foot of the heading block (§7.7). It
       * keeps its 44px of height on a phone rather than shrinking to fit — the
       * words on it are what shorten, and the full name is still there for a
       * screen reader.
       */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p
            style={labelEnter.style}
            className={`flex items-center gap-2.5 font-heading text-xs font-medium uppercase tracking-[0.18em] text-accent ${labelEnter.className}`}
          >
            <span aria-hidden className="size-2 rounded-full bg-accent" />
            My work
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            <TextReveal show={inView} delayMs={ENTER.heading} durationMs={850}>
              Featured Projects
            </TextReveal>
          </h2>

          {intro ? (
            <p style={introEnter.style} className={`mt-2 text-sm text-muted ${introEnter.className}`}>
              {intro}
            </p>
          ) : null}
        </div>

        <Link
          to="/work"
          style={viewAllEnter.style}
          className={`group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface/40 px-4 font-heading text-sm font-medium text-fg [transition-property:opacity,transform,filter,color,border-color] ease-out-expo hover:border-accent hover:text-accent sm:px-5 ${viewAllEnter.className}`}
        >
          View all<span className="sr-only"> projects</span>
          <span
            aria-hidden
            className="transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          >
            ↗
          </span>
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
          {projects.data.items.map((project, index) => (
            <ProjectCard
              key={project._id}
              project={project}
              inView={inView}
              delayMs={ENTER.firstCard + index * CARD_STEP_MS}
            />
          ))}
        </Carousel>
      ) : null}
    </section>
  );
}

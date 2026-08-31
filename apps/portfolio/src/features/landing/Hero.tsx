import { Link } from "react-router-dom";

import { Mark, findMark } from "../../components/Mark";
import { TextReveal } from "../../components/TextReveal";
import { buttonClasses } from "../../components/Button";
import { Terminal } from "../../components/Terminal";
import { entering, useEntered } from "../../lib/entrance";
import { parallaxStyle, useSectionProgress } from "../../lib/useParallax";
import { useOnScreen } from "../../lib/useOnScreen";
import type { LandingData } from "./landingData";

/**
 * The top of the landing page.
 *
 * Every word here is the published `landing` record — the role pill, greeting,
 * name, statement, disciplines, the two button labels, the tech row and the
 * badge (§2 rule 8). A field left empty in the portal is a piece of the hero
 * that does not render, rather than an empty heading or a placeholder (§7.4).
 *
 * The second button is the one piece that needs two things rather than one: a
 * label, and a CV that publishing resolved into a public URL. Either missing
 * and there is no button, because a download that downloads nothing is worse
 * than no download.
 *
 * Three columns at `lg`, as the design draws them: the words with the tech row
 * beneath them, the portrait, and the rail with the terminal and the purpose
 * panel on it.
 *
 * Below `lg` it is one column and the pieces are re-ordered rather than
 * dropped, which is the 390px hero in §7.7: the words, then the terminal at
 * full width, then the tech row. The portrait comes out of the flow and is
 * pinned to the right of the words, fading into the page on its left and at its
 * foot so the headline stays the thing you read. The purpose panel is the one
 * piece that does go — it is a note pinned to a rail that no longer exists.
 *
 * The order is grid placement rather than duplicated markup: there is one
 * terminal and one tech row in the document at every width, and the columns are
 * assigned explicitly so the source can stack the way a phone reads.
 *
 * ## The entrance
 *
 * One trigger, `ENTER`, and a delay per piece — so this is one piece of
 * choreography rather than nine components each deciding when to appear. The
 * order is the order the page is meant to be read in: the pill, the greeting,
 * the name, the sentence, the disciplines, the buttons, and the ornaments
 * behind them. It is finished inside 1.7 seconds, and every step of it is
 * transform, opacity and blur, so none of it costs layout (§18).
 *
 * `useEntered` is false only for the first frame after this component mounts,
 * and it mounts when the published record exists — the page renders nothing
 * here until then. So the choreography cannot play to an empty column, and it
 * cannot play twice.
 *
 * This is a departure from the rule this file used to state, that nothing above
 * the fold animates on first paint. That rule is about Largest Contentful
 * Paint: the headline is the largest thing on the page, so the moment it
 * becomes visible is the moment the page is measured as having loaded, and an
 * element at `opacity: 0` has not become visible. The cost is real and it is
 * bounded — the name is the third step, unmasked around 300ms after the record
 * arrives, not at the end of the sequence. Everything with a longer delay is an
 * ornament that LCP does not measure.
 *
 * ## The parallax
 *
 * `useSectionProgress` publishes one number on the section as it leaves, and
 * the four layers inside multiply it by different distances: the words travel
 * furthest and fade slightly, the portrait less, the rail drifts the other way,
 * and the grid behind all of it moves least of all (`useGridDrift`, in
 * `App.tsx`). Nothing leaves the screen — the whole displacement is under
 * seventy pixels. It is there to give the hero a foreground and a background,
 * not to be noticed as an effect.
 *
 * Every layer sits at zero displacement at rest, which is what makes the whole
 * thing safe to lose: under reduced motion the hook never subscribes and
 * `index.css` strips the transform, and each layer is already exactly where the
 * stylesheet put it (§7.5).
 */

/** The step, in milliseconds, for each piece of the entrance. */
const ENTER = {
  role: 80,
  greeting: 180,
  name: 300,
  statement: 430,
  disciplines: 530,
  actions: 620,
  portrait: 360,
  terminal: 500,
  badge: 660,
  techLabel: 700,
  techFirst: 760,
} as const;

/** Held between one tech mark and the next. */
const TECH_STEP_MS = 55;

/**
 * When the terminal starts typing: after it has finished arriving, so the panel
 * is settled before anything inside it moves.
 */
const TERMINAL_TYPE_DELAY_MS = 1000;

export function Hero({ data }: { data: LandingData }) {
  const {
    role,
    greeting,
    name,
    statement,
    disciplines,
    heroPrimaryLabel,
    heroSecondaryLabel,
    badge,
    terminalLines,
    terminalTitle,
    techLabel,
    techMarks,
  } = data;
  const portrait = data.portrait;
  const cv = data.cv;

  const entered = useEntered();
  const sectionRef = useSectionProgress<HTMLElement>();
  // The ambient float is stopped once the portrait is off screen: a compositor
  // animating a layer nobody can see is the cheapest waste on the page to
  // remove, and the most easily forgotten (§18).
  const portraitFloat = useOnScreen<HTMLDivElement>();

  const hasHeading = greeting !== "" || name !== "";
  const hasBadge = badge.title !== "" || badge.body !== "";

  // A label with nowhere to go is not a button. The first always has somewhere
  // — the work index — so its label is the whole of the test; the second needs
  // the file as well.
  const showPrimary = heroPrimaryLabel !== "";
  const showSecondary = heroSecondaryLabel !== "" && cv !== null;
  const hasActions = showPrimary || showSecondary;

  // Keys that resolved to nothing are dropped rather than drawn as gaps: a
  // withheld mark costs the row one logo, not its shape (§7.4).
  const tech = techMarks
    .map((key) => findMark(data.marks, key))
    .filter((mark): mark is NonNullable<typeof mark> => mark !== null);

  const hasCopy =
    role !== "" ||
    hasHeading ||
    statement !== "" ||
    disciplines.length > 0 ||
    hasActions ||
    tech.length > 0;
  const hasTerminal = terminalLines.length > 0;
  const hasRail = hasTerminal || hasBadge;

  if (!hasCopy && !hasRail && portrait === null) return null;

  /*
   * The columns collapse from the outside in. The portrait is the first to go
   * because it is the one that says nothing, then the rail, and what is left is
   * the words — which is the same page with its ornaments removed rather than a
   * different layout at each width.
   */
  const columns = portrait
    ? hasRail
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]"
      : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
    : hasRail
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      : "";

  /*
   * Which column each ornament lands in at `lg`, given which of them exist.
   * Both span the two rows the words occupy, so the grid's `items-center` lines
   * them up against the whole of the left column rather than against its first
   * row.
   *
   * Stated here rather than left to source order because the source order is
   * the phone's, and the two disagree: the terminal is written before the tech
   * row so it stacks above it, but sits to the right of both at desktop width.
   */
  /*
   * The copy of the portrait a phone fetches.
   *
   * This was one slot and one variant while the picture was desktop-only. It is
   * now a ~200px slot below `lg` and a ~30rem one above it, and the `hero`
   * variant on a phone is the thing §10 is about — so below `lg` the `card`
   * variant is offered instead, which is still four times the pixels that slot
   * can show on a 2× screen.
   *
   * A `media` query rather than `srcset` widths, because the widths would be a
   * guess: `sharp` resizes *towards* `ASSET_VARIANT_WIDTHS` and never upscales,
   * so an upload narrower than 1600px has a `hero` that is not 1600px wide and
   * the snapshot does not carry what it actually is. A breakpoint is something
   * this file knows for certain.
   */
  const portraitCard = portrait?.variants?.card ?? null;

  const spanRows = "lg:row-start-1 lg:row-span-2";
  const portraitPlacement = `lg:col-start-2 ${spanRows}`;
  const railPlacement = `${portrait ? "lg:col-start-3" : "lg:col-start-2"} ${spanRows}`;

  const roleEnter = entering(entered, "up", ENTER.role, 600);
  const statementEnter = entering(entered, "up", ENTER.statement);
  const disciplinesEnter = entering(entered, "up", ENTER.disciplines);
  const actionsEnter = entering(entered, "up", ENTER.actions);
  const portraitEnter = entering(entered, "lift", ENTER.portrait, 1000);
  const terminalEnter = entering(entered, "right", ENTER.terminal, 900);
  const badgeEnter = entering(entered, "right", ENTER.badge, 800);
  const techLabelEnter = entering(entered, "up", ENTER.techLabel, 600);

  return (
    <section ref={sectionRef} className="mx-auto max-w-6xl px-5 py-8 sm:py-10 lg:py-12">
      {/* `relative`, because below `lg` the portrait is pinned to this box. */}
      <div className={`relative grid items-center gap-10 lg:gap-10 ${columns}`}>
        {/*
         * The words. `z-10` so they sit in front of the portrait on a phone,
         * where the two share the same space rather than taking a column each.
         *
         * This is the front layer of the parallax: it travels the furthest as
         * the hero leaves, and takes a little opacity with it so what is behind
         * it comes forward rather than the two sliding past each other at the
         * same weight. The entrance below is on the individual lines, not on
         * this box — one element cannot hold two transforms.
         */}
        <div
          style={parallaxStyle(-64, 0.72)}
          className="relative z-10 min-w-0 will-change-transform lg:col-start-1 lg:row-start-1"
        >
          {/*
           * The pill above the headline. A dot and a word — the dot is painted
           * geometry rather than a mark, because there is nothing behind it to
           * look up or correct (§7.3).
           */}
          {role ? (
            <p
              style={roleEnter.style}
              className={`mb-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-2 font-heading text-xs font-medium uppercase tracking-[0.16em] text-fg ${roleEnter.className}`}
            >
              <span aria-hidden className="size-2 rounded-full bg-accent" />
              {role}
            </p>
          ) : null}

          {/*
           * The name takes a line of its own rather than wrapping after the
           * greeting, because it is the thing on the page a visitor is meant to
           * come away with and a greeting that pushes it onto a ragged second
           * line makes it look incidental.
           *
           * Each line is uncovered rather than faded, and the name follows the
           * greeting by a beat — the two lines arriving together would be one
           * block of text appearing, which is the thing a masked reveal exists
           * to avoid (§4).
           */}
          {hasHeading ? (
            <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.05em] text-fg sm:text-6xl lg:text-7xl">
              {/*
               * The trailing space is not decoration. Both halves are blocks,
               * so it changes nothing on screen — but without it the heading's
               * accessible name is one run-together word.
               */}
              {greeting ? (
                <TextReveal show={entered} delayMs={ENTER.greeting} durationMs={800}>
                  {greeting}{" "}
                </TextReveal>
              ) : null}
              {name ? (
                <TextReveal
                  show={entered}
                  delayMs={ENTER.name}
                  durationMs={950}
                  className="text-accent"
                >
                  {name}
                </TextReveal>
              ) : null}
            </h1>
          ) : null}

          {/*
           * Held short of the portrait on a phone rather than run under it: the
           * headline is one or two words a line and clears the figure on its
           * own, but a sentence set to the full width would run behind a
           * shoulder.
           */}
          {statement ? (
            <p
              style={statementEnter.style}
              className={`mt-6 max-w-[60%] text-lg text-muted sm:text-xl lg:max-w-md ${statementEnter.className}`}
            >
              {statement}
            </p>
          ) : null}

          {/*
           * The disciplines are one line in the accent, separated by dots. The
           * separators are decoration — a screen reader gets the list items and
           * nothing else.
           */}
          {disciplines.length > 0 ? (
            <ul
              style={disciplinesEnter.style}
              className={`mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-sm font-medium uppercase tracking-[0.18em] text-accent ${disciplinesEnter.className}`}
            >
              {disciplines.map((discipline, index) => (
                <li key={discipline} className="flex items-center gap-3">
                  {index > 0 ? <span aria-hidden>•</span> : null}
                  <span>{discipline}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/*
           * The two buttons. Neither destination is authored: the first is the
           * work index and the second is the CV publishing resolved, because an
           * href written in the portal is a link on a public page that nobody
           * reviews.
           *
           * The CV opens in a tab rather than saving quietly — the file is on
           * the blob container, a different origin, and `download` is ignored
           * across origins. Saying so here so nobody later reads the attribute
           * as a promise it keeps.
           *
           * Held to the words' half of the phone like the statement above: a
           * full-width button under a portrait would run beneath it.
           */}
          {hasActions ? (
            <div
              style={actionsEnter.style}
              className={`mt-8 flex max-w-[85%] flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center ${actionsEnter.className}`}
            >
              {showPrimary ? (
                <Link to="/work" className={buttonClasses("primary", "group w-full sm:w-auto")}>
                  {heroPrimaryLabel}
                  {/*
                   * The arrow leans towards where it is going on hover. It is
                   * the only thing on the button that moves independently, and
                   * it moves about four pixels — enough to read as the control
                   * responding, not as an animation.
                   */}
                  <span
                    aria-hidden
                    className="transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  >
                    ↗
                  </span>
                </Link>
              ) : null}

              {showSecondary && cv ? (
                <a
                  href={cv.url}
                  download={cv.filename || undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClasses("secondary", "group w-full sm:w-auto")}
                >
                  {heroSecondaryLabel}
                  <span
                    aria-hidden
                    className="transition-transform duration-300 ease-out-expo group-hover:translate-y-0.5"
                  >
                    ↓
                  </span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {/*
         * The rail: the terminal, and the purpose panel under it.
         *
         * The terminal is here at every width — full width under the buttons on
         * a phone, on the rail beside the words at desktop width (§7.7). The
         * purpose panel is a note pinned to that rail and goes with it, so it is
         * `lg` and up only; a record with nothing but a badge in it has no rail
         * on a phone at all rather than a lone card.
         *
         * The rail drifts *down* as the hero leaves while the words go up. That
         * is the whole of the layering: two things moving apart read as two
         * distances from the viewer, where two things moving together read as
         * one sheet of paper.
         */}
        {hasRail ? (
          <div
            style={parallaxStyle(34)}
            className={`${hasTerminal ? "flex" : "hidden lg:flex"} relative z-10 min-w-0 flex-col gap-5 will-change-transform ${railPlacement}`}
          >
            {hasTerminal ? (
              // Wrapped rather than given the classes directly: the terminal's
              // own root carries the pointer parallax, and one element cannot
              // hold two transforms.
              <div style={terminalEnter.style} className={terminalEnter.className}>
                <Terminal
                  lines={terminalLines}
                  title={terminalTitle}
                  startDelayMs={TERMINAL_TYPE_DELAY_MS}
                />
              </div>
            ) : null}

            {/*
             * The purpose panel: a rule in the accent down its left edge rather
             * than a full border, so it reads as a note pinned to the terminal
             * instead of another card. The glyph in its corner is painted
             * geometry, not a mark — there is nothing behind it to look up.
             */}
            {hasBadge ? (
              <div
                style={badgeEnter.style}
                className={`hidden rounded-r-lg border-y border-r border-border border-l-2 border-l-accent bg-surface/70 p-5 lg:block ${badgeEnter.className}`}
              >
                <div className="flex items-start justify-between gap-4">
                  {badge.title ? (
                    <p className="font-heading text-sm font-bold text-accent">
                      {badge.title}
                    </p>
                  ) : null}
                  <span
                    aria-hidden
                    className="shrink-0 font-mono text-xs text-muted"
                  >
                    &lt;/&gt;
                  </span>
                </div>
                {badge.body ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {badge.body}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/*
         * The tech row. Marks only, each in a tile of its own at the size the
         * design draws them, with the mark's label carried for a screen reader —
         * `Mark` is `aria-hidden`, so without this the row announces as nothing
         * at all.
         *
         * Below `lg` it is a single snapping line that runs off the right edge
         * and is swiped, which is the same CSS the carousels use and no library
         * (§7.5). The scrollbar is hidden: the row is plainly cut off at the
         * edge, which is the affordance.
         *
         * `min-w-0` on the block around it is load-bearing rather than tidy. A
         * grid item will not shrink below its own min-content, and a row of
         * seven tiles that cannot wrap has a min-content of seven tiles — so
         * without it the row does not scroll, it widens the column, and takes
         * the hero and the page's horizontal scrollbar with it.
         *
         * From `lg` it wraps instead, because the column it sits in is narrower
         * than a phone and a scrolling strip inside a 330px column reads as
         * broken rather than as a row.
         *
         * The tiles arrive one after another, last of the hero. It is the only
         * per-item stagger above the fold and it earns it: a row of identical
         * squares appearing at once is a texture, and appearing in sequence is
         * a list of things somebody works with.
         */}
        {tech.length > 0 ? (
          <div
            style={parallaxStyle(-40, 0.85)}
            className="relative z-10 min-w-0 lg:col-start-1 lg:row-start-2"
          >
            {techLabel ? (
              <p
                style={techLabelEnter.style}
                className={`font-heading text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted ${techLabelEnter.className}`}
              >
                {techLabel}
              </p>
            ) : null}

            <ul className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-x-visible [&::-webkit-scrollbar]:hidden">
              {tech.map((mark, index) => {
                const markEnter = entering(
                  entered,
                  "up",
                  ENTER.techFirst + index * TECH_STEP_MS,
                  600,
                );

                return (
                  <li
                    key={mark.key}
                    style={markEnter.style}
                    className={`shrink-0 snap-start ${markEnter.className}`}
                  >
                    <span className="flex size-14 items-center justify-center rounded-xl border border-border bg-surface-deep transition-colors duration-300 hover:border-border-strong">
                      <Mark mark={mark} className="size-8" />
                    </span>
                    <span className="sr-only">{mark.label || mark.key}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/*
         * The portrait.
         *
         * At `lg` it is a column of its own between the words and the rail,
         * bounded on both axes, and the column is the one that usually binds:
         * the upload is taller than it is wide, so widening this column is what
         * makes the picture bigger — raising the height cap alone does nothing
         * until the cap is the smaller of the two. The element box stays the
         * picture and nothing else — the glow behind it and the fade at its
         * foot both measure against the image itself, which letterboxing inside
         * a wider box would throw out. It takes the `hero` variant for the
         * largest slot on the page, never the original upload (§10), and its
         * alt text is whatever was written on the asset — usually nothing,
         * which is the right answer for a picture beside your own name.
         *
         * Below `lg` there is no column to give it, so it comes out of the flow
         * and is pinned to the top right of the hero with the words in front of
         * it (§7.7). It takes no pointer events there: at that width it is
         * behind the statement and the buttons, and a picture must not be what
         * swallows a tap meant for the CTA.
         *
         * Three nested boxes, because three different things move it and no
         * element can hold more than one transform: the outer is the parallax
         * layer, the middle is the entrance, and the inner is the ambient
         * float. Every one of them rests at zero, so reduced motion stripping
         * all three leaves the picture exactly where the stylesheet puts it.
         */}
        {portrait ? (
          <div
            style={parallaxStyle(-26, 0.85)}
            className={`pointer-events-none absolute right-0 top-0 w-[58%] max-w-[15rem] will-change-transform lg:pointer-events-auto lg:relative lg:right-auto lg:top-auto lg:w-auto lg:max-w-none ${portraitPlacement}`}
          >
            {/*
             * The light behind the figure, so it stands in the room rather than
             * on top of it. The colour is the same token the lit panels use —
             * §7.1 admits no hex outside `index.css`.
             *
             * It breathes on a seven second cycle against the portrait's nine,
             * so the two never fall into step and become one visible pulse.
             * Opacity only: a glow that changed size would be a glow that
             * moved, and this one is meant to be the light in the room.
             */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 bottom-10 top-6 mx-auto max-w-xs rounded-full bg-[radial-gradient(circle,var(--color-accent-glow),transparent_70%)] blur-3xl animate-portrait-halo ${
                portraitFloat.onScreen ? "" : "[animation-play-state:paused]"
              }`}
            />

            <div style={portraitEnter.style} className={portraitEnter.className}>
              {/*
               * Seven pixels and eight tenths of a percent, over nine seconds.
               * It should not be possible to watch this happen — the picture
               * should simply not feel pinned to the page.
               */}
              <div
                ref={portraitFloat.ref}
                className={`animate-portrait-float ${
                  portraitFloat.onScreen ? "" : "[animation-play-state:paused]"
                }`}
              >
                {/*
                 * The fade at the foot. The upload is a crop, and a crop ends in
                 * a straight line across the page unless the last of it is
                 * masked away.
                 */}
                <picture>
                  {portraitCard ? (
                    <source media="(max-width: 1023px)" srcSet={portraitCard} />
                  ) : null}
                  <img
                    src={portrait.variants?.hero ?? portrait.url}
                    alt={portrait.alt}
                    className="relative mx-auto max-h-[22rem] w-auto max-w-full object-contain [-webkit-mask-image:linear-gradient(to_bottom,black_78%,transparent)] [mask-image:linear-gradient(to_bottom,black_78%,transparent)] lg:max-h-[34rem]"
                  />
                </picture>
              </div>
            </div>

            {/*
             * The fade on the left, below `lg` only. At that width the words
             * are over the picture rather than beside it, and the edge of a
             * shoulder running behind a line of text is what makes the line
             * hard to read.
             */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-canvas via-canvas/60 to-transparent lg:hidden"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

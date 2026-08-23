import { Carousel } from '../components/Carousel';
import { Reveal } from '../components/Reveal';
import { TypeOut } from '../components/TypeOut';

/**
 * A harness for the three motion primitives, and nothing else.
 *
 * It exists so the primitives can be looked at before anything depends on
 * them — arrows and snapping on a desktop, a swipe on a phone, and both of the
 * reduced-motion paths. It is not a page of the site: `App.tsx` only mounts the
 * route under `import.meta.env.DEV`, so it is unreachable in any deployed
 * build, and none of the strings below are portfolio copy (§2 rule 8) — they
 * are labels on a test rig.
 */
const slides = Array.from({ length: 8 }, (_, index) => index + 1);

export function MotionScratchPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Motion primitives
        </h1>
        <p className="mt-3 text-base text-muted">
          Development harness for Carousel, Reveal and TypeOut. Not part of the site.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-muted">
          TypeOut
        </h2>
        <div className="mt-4 rounded-2xl border border-border bg-surface p-5 font-mono text-sm text-fg">
          <TypeOut text="$ wroom build --target portfolio" />
        </div>
        <p className="mt-3 text-sm text-muted">
          With reduced motion on, the whole line is present on first paint and the caret
          does not blink.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-muted">
          Carousel — eight slides
        </h2>
        <Carousel label="Motion harness slides" className="mt-4">
          {slides.map((n) => (
            <article
              key={n}
              className="flex h-56 flex-col justify-between rounded-2xl border border-border bg-surface p-5"
            >
              <span className="font-heading text-4xl font-bold text-accent">{n}</span>
              <span className="text-sm text-muted">
                Slide {n} of {slides.length}
              </span>
            </article>
          ))}
        </Carousel>
        <p className="mt-3 text-sm text-muted">
          Arrows from md up, swipe below it. Dots track the nearest slide either way.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-muted">
          Reveal — scroll down
        </h2>
        <p className="mt-3 text-sm text-muted">
          With reduced motion on, every block below is already visible without scrolling.
        </p>
        <div className="mt-4 space-y-4">
          {slides.map((n) => (
            <Reveal key={n} delayMs={(n % 3) * 80}>
              <div className="rounded-2xl border border-border bg-surface p-8">
                <p className="font-heading text-lg font-semibold text-fg">Reveal {n}</p>
                <p className="mt-1 text-sm text-muted">
                  Fades and lifts once, then stops being observed.
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Height, so the reveals above have somewhere to be scrolled from. */}
      <div className="h-[60vh]" />
    </div>
  );
}

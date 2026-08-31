import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, type Location } from 'react-router-dom';

import { NotFound } from './components/NotFound';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { entering, useEntered } from './lib/entrance';
import { useGridDrift } from './lib/useParallax';
import { usePrefersReducedMotion } from './lib/usePrefersReducedMotion';
import { useSmoothScroll } from './lib/useSmoothScroll';
import { AboutPage } from './pages/AboutPage';
import { CaseStudyPage } from './pages/CaseStudyPage';
import { ContactPage } from './pages/ContactPage';
import { LandingPage } from './pages/LandingPage';
import { MotionScratchPage } from './pages/MotionScratchPage';
import { ProjectPage } from './pages/ProjectPage';
import { SkillsPage } from './pages/SkillsPage';
import { WorkPage } from './pages/WorkPage';

/** How long the outgoing page has to fade before it is replaced. */
const EXIT_MS = 170;

/** How long the incoming page takes to settle. */
const ENTER_MS = 460;

function SiteRoutes({ location }: { location: Location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/work" element={<WorkPage />} />
      <Route path="/work/:slug" element={<ProjectPage />} />
      {/*
       * A case study lives under its project because its slug is unique
       * within that project, not globally (docs/DATA_MODEL.md, decision 7).
       * The edge function in middleware.ts matches `/work/:slug` — one
       * segment — so this deeper path never reaches it and unfurls with the
       * shell's default tags. Widening that matcher is a ticket (§7.6).
       */}
      <Route path="/work/:slug/case/:caseSlug" element={<CaseStudyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/skills" element={<SkillsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      {/*
       * A harness for the motion primitives, mounted in development only.
       * `import.meta.env.DEV` is replaced with a literal at build time, so
       * the route — and the page behind it — is absent from every deployed
       * build rather than merely unlinked.
       */}
      {import.meta.env.DEV ? (
        <Route path="/_motion" element={<MotionScratchPage />} />
      ) : null}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/**
 * One page, arriving.
 *
 * Keyed on the location it renders, so a navigation remounts it and the
 * entrance runs again — which is the whole mechanism, and why there is no
 * animation library here to hold an outgoing tree alive.
 *
 * `animate` is false for the very first page of a visit. The landing hero has
 * an entrance of its own that starts the moment its content arrives, and
 * wrapping that in a second one would delay the headline twice over for no
 * additional effect. A page reached by clicking a link has no such entrance and
 * this is the whole of its arrival.
 */
function PageFrame({ location, animate }: { location: Location; animate: boolean }) {
  const entered = useEntered();
  const enter = entering(animate ? entered : true, 'up', 0, ENTER_MS);

  return (
    <div style={enter.style} className={enter.className}>
      <SiteRoutes location={location} />
    </div>
  );
}

export function App() {
  /*
   * Weighted wheel scrolling, and the drift on the background grid. Both are
   * whole-document effects with nowhere else to live, and both withdraw
   * entirely under reduced motion.
   */
  useSmoothScroll();
  useGridDrift();

  const location = useLocation();
  const reduced = usePrefersReducedMotion();

  /*
   * Which page is on screen, which is not always the one the router is on.
   *
   * A route transition needs the outgoing page to still exist while it leaves,
   * and React Router will have swapped it the instant the URL changed. So the
   * rendered location is held here and allowed to lag: the current page fades
   * for `EXIT_MS`, then is replaced and the new one is given `ENTER_MS` to
   * settle. Six hundred milliseconds end to end, which is short enough to feel
   * like the page responded and long enough to read as deliberate (§15).
   *
   * Under reduced motion the swap is immediate and neither half runs.
   */
  const [frame, setFrame] = useState({ location, animate: false });
  const leaving = frame.location.key !== location.key;

  useEffect(() => {
    if (!leaving) return;

    if (reduced) {
      setFrame({ location, animate: false });
      return;
    }

    const id = window.setTimeout(() => setFrame({ location, animate: true }), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving, location, reduced]);

  return (
    /*
     * `relative z-10` and no background of its own: the grid in `index.css` is
     * a fixed pseudo-element at z-0, and an opaque wrapper here would paint
     * straight over it. The canvas colour comes from `body`.
     */
    <div className="relative z-10 flex min-h-dvh flex-col">
      <SiteHeader />
      {/*
       * The exit is opacity alone, on the element that stays put. A transform
       * or a filter here would make `main` the containing block for anything
       * inside it that is ever positioned against the viewport, and the exit is
       * not worth buying that with.
       */}
      <main
        className={`flex-1 transition-opacity ease-out-soft ${
          leaving ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
      >
        <PageFrame key={frame.location.key} location={frame.location} animate={frame.animate} />
      </main>
      <SiteFooter />
    </div>
  );
}

import { Route, Routes } from 'react-router-dom';

import { NotFound } from './components/NotFound';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { AboutPage } from './pages/AboutPage';
import { CaseStudyPage } from './pages/CaseStudyPage';
import { ContactPage } from './pages/ContactPage';
import { LandingPage } from './pages/LandingPage';
import { MotionScratchPage } from './pages/MotionScratchPage';
import { ProjectPage } from './pages/ProjectPage';
import { SkillsPage } from './pages/SkillsPage';
import { WorkPage } from './pages/WorkPage';

export function App() {
  return (
    /*
     * `relative z-10` and no background of its own: the grid in `index.css` is
     * a fixed pseudo-element at z-0, and an opaque wrapper here would paint
     * straight over it. The canvas colour comes from `body`.
     */
    <div className="relative z-10 flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Routes>
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
      </main>
      <SiteFooter />
    </div>
  );
}

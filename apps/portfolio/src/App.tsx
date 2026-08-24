import { Route, Routes } from 'react-router-dom';

import { NotFound } from './components/NotFound';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { AboutPage } from './pages/AboutPage';
import { CaseStudyPage } from './pages/CaseStudyPage';
import { ContactPage } from './pages/ContactPage';
import { LandingPage } from './pages/LandingPage';
import { MotionScratchPage } from './pages/MotionScratchPage';
import { SkillsPage } from './pages/SkillsPage';
import { WorkPage } from './pages/WorkPage';

export function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/work/:slug" element={<CaseStudyPage />} />
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

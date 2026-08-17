import { Link, Navigate, Route, Routes } from 'react-router-dom';

import { CaseStudyPage } from './pages/CaseStudyPage';
import { WorkPage } from './pages/WorkPage';

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center">
      <p className="text-base font-medium text-slate-900">Page not found</p>
      <Link to="/work" className="mt-4 inline-block text-sm font-medium text-slate-900 underline">
        See the work
      </Link>
    </div>
  );
}

export function App() {
  return (
    <div className="min-h-dvh">
      <Routes>
        <Route path="/" element={<Navigate to="/work" replace />} />
        <Route path="/work" element={<WorkPage />} />
        <Route path="/work/:slug" element={<CaseStudyPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

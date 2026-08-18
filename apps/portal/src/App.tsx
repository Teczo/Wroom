import { Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell';
import { AuthGate } from './components/AuthGate';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { NewProjectPage } from './pages/projects/NewProjectPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';

export function App() {
  return (
    <AuthGate>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </AuthGate>
  );
}

import { Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell';
import { AuthGate } from './components/AuthGate';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccountDetailPage } from './pages/accounts/AccountDetailPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { CredentialDetailPage } from './pages/credentials/CredentialDetailPage';
import { CredentialsPage } from './pages/credentials/CredentialsPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { NewProjectPage } from './pages/projects/NewProjectPage';
import { CaseStudyPage } from './pages/projects/CaseStudyPage';
import { ProjectAssetsPage } from './pages/projects/ProjectAssetsPage';
import { ProjectBoardPage } from './pages/projects/ProjectBoardPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { IntegrationsPage } from './pages/settings/IntegrationsPage';
import { ProjectTypesPage } from './pages/settings/ProjectTypesPage';

export function App() {
  return (
    <AuthGate>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/board" element={<ProjectBoardPage />} />
          <Route path="/projects/:id/assets" element={<ProjectAssetsPage />} />
          <Route path="/projects/:id/case-study" element={<CaseStudyPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:id" element={<AccountDetailPage />} />
          <Route path="/credentials" element={<CredentialsPage />} />
          <Route path="/credentials/:id" element={<CredentialDetailPage />} />
          <Route path="/settings/project-types" element={<ProjectTypesPage />} />
          <Route path="/settings/integrations" element={<IntegrationsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </AuthGate>
  );
}

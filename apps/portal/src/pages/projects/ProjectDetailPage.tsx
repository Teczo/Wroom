import type { Project } from '@wroom/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { Pill, ProjectStatusPill } from '../../components/Pill';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { CostsPanel } from '../../features/costs/CostsPanel';
import { ProjectCredentials } from '../../features/credentials/ProjectCredentials';
import { DecisionsPanel } from '../../features/decisions/DecisionsPanel';
import { EnvironmentsPanel } from '../../features/environments/EnvironmentsPanel';
import { ProjectLinksPanel } from '../../features/links/ProjectLinksPanel';
import { NotesPanel } from '../../features/notes/NotesPanel';
import { FeatureBoard } from '../../features/features/FeatureBoard';
import { CsvTemplateButton } from '../../features/features/CsvTemplateButton';
import { FeatureImport } from '../../features/features/FeatureImport';
import { ProjectEditForm } from '../../features/projects/ProjectEditForm';
import { ProjectLifecycle } from '../../features/projects/ProjectLifecycle';
import { PublishPanel } from '../../features/projects/PublishPanel';
import { ServicesPanel } from '../../features/services/ServicesPanel';
import { useProject } from '../../features/projects/api';
import { TimePanel } from '../../features/time/TimePanel';
import { hours, money, relativeDate, shortDate } from '../../lib/format';

const tabs = ['Overview', 'Features', 'Costs', 'Time', 'Edit'] as const;
type Tab = (typeof tabs)[number];

function Overview({ project }: { project: Project }) {
  const stack = [
    ...project.techStack.frontend,
    ...project.techStack.backend,
    ...project.techStack.database,
    ...project.techStack.other,
  ];

  const details = Object.entries(project.details);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Complete', value: `${project.rollup.percentComplete}%` },
          { label: 'Run rate', value: `${money(project.rollup.monthlyCostAud)}/mo` },
          { label: 'Spent', value: money(project.rollup.totalSpendAud) },
          { label: 'Hours', value: hours(project.rollup.totalHours) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Details</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { term: 'Type', value: project.projectTypeKey },
            { term: 'Phase', value: project.phase || '—' },
            { term: 'Started', value: shortDate(project.startedAt) },
            { term: 'Launched', value: shortDate(project.launchedAt) },
            { term: 'Repo', value: project.repo.fullName || '—' },
            { term: 'Last activity', value: relativeDate(project.rollup.lastActivityAt) },
          ].map((row) => (
            <div key={row.term}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{row.term}</dt>
              <dd className="mt-0.5 truncate text-sm text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>

        {details.length > 0 ? (
          <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            {details.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{key}</dt>
                <dd className="mt-0.5 text-sm text-slate-900">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {stack.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
            {stack.map((entry) => (
              <Pill key={entry} label={entry} />
            ))}
          </div>
        ) : null}
      </section>

      <EnvironmentsPanel projectId={project._id} />

      <ServicesPanel projectId={project._id} projectTypeKey={project.projectTypeKey} />

      <ProjectCredentials projectId={project._id} />

      <ProjectLinksPanel projectId={project._id} />

      <NotesPanel projectId={project._id} />

      <DecisionsPanel projectId={project._id} />

      <PublishPanel project={project} />
    </div>
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [tab, setTab] = useState<Tab>('Overview');
  const [importing, setImporting] = useState(false);

  if (project.isPending) {
    return (
      <>
        <PageHeader title="Project" />
        <LoadingState label="Loading project…" />
      </>
    );
  }

  if (project.isError) {
    return (
      <>
        <PageHeader
          title="Project"
          actions={
            <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-900">
              Back to projects
            </Link>
          }
        />
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={project.data.name}
        subtitle={project.data.shortDescription || undefined}
        actions={<ProjectStatusPill status={project.data.status} />}
      />

      <div className="-mx-4 mb-6 overflow-x-auto border-b border-slate-200 px-4">
        <div className="flex min-w-max gap-1" role="tablist">
          {tabs.map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={`min-h-11 border-b-2 px-4 text-sm font-medium ${
                tab === name
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Overview' ? <Overview project={project.data} /> : null}
      {tab === 'Features' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-end gap-2">
            <CsvTemplateButton />
            <Button
              variant="secondary"
              className="min-h-9 text-xs"
              onClick={() => setImporting((current) => !current)}
            >
              {importing ? 'Close import' : 'Import CSV'}
            </Button>
            <Link to={`/projects/${id}/board`}>
              <Button variant="secondary" className="min-h-9 text-xs">
                Open the board
              </Button>
            </Link>
          </div>

          <p className="text-right text-xs text-slate-500">
            The template has one example row — delete it before importing. In{' '}
            <span className="font-mono">labels</span> and{' '}
            <span className="font-mono">dependsOn</span>, separate several values with a semicolon;{' '}
            <span className="font-mono">dependsOn</span> holds the refs of other features.
          </p>

          {importing ? (
            <FeatureImport projectId={id} onDone={() => setImporting(false)} />
          ) : null}

          <FeatureBoard projectId={id} />
        </div>
      ) : null}
      {tab === 'Costs' ? <CostsPanel projectId={id} /> : null}
      {tab === 'Time' ? <TimePanel projectId={id} /> : null}
      {tab === 'Edit' ? (
        <div className="space-y-8">
          <ProjectEditForm project={project.data} />
          <ProjectLifecycle project={project.data} />
        </div>
      ) : null}
    </>
  );
}

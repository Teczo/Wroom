import type { Project } from '@wroom/shared';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { ProjectStatusPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useProjects } from '../../features/projects/api';
import { hours, money, relativeDate } from '../../lib/format';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ActiveProjectRow({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{project.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {project.rollup.percentComplete}% complete · {relativeDate(project.rollup.lastActivityAt)}
        </p>
      </div>
      <ProjectStatusPill status={project.status} />
    </Link>
  );
}

export function DashboardPage() {
  const projects = useProjects();

  if (projects.isPending) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <LoadingState label="Loading your projects…" />
      </>
    );
  }

  if (projects.isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      </>
    );
  }

  const items = projects.data.items;

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          title="Nothing is being tracked yet"
          whatToDoNext="Create a product first — it is the group a project belongs to — then add your first project under it."
          action={
            <Link to="/products">
              <Button>Create a product</Button>
            </Link>
          }
        />
      </>
    );
  }

  const monthlyCost = items.reduce((sum, project) => sum + project.rollup.monthlyCostAud, 0);
  const totalHours = items.reduce((sum, project) => sum + project.rollup.totalHours, 0);
  const live = items.filter((project) => project.status === 'live').length;
  const active = items
    .filter((project) => project.status !== 'archived')
    .sort(
      (a, b) =>
        new Date(b.rollup.lastActivityAt ?? 0).getTime() -
        new Date(a.rollup.lastActivityAt ?? 0).getTime(),
    )
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${items.length} project${items.length === 1 ? '' : 's'} tracked`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Run rate" value={money(monthlyCost)} hint="per month" />
        <Stat label="Live" value={String(live)} hint="in production" />
        <Stat label="Hours" value={hours(totalHours)} hint="logged in total" />
        <Stat label="Projects" value={String(items.length)} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recently active</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {active.map((project) => (
            <ActiveProjectRow key={project._id} project={project} />
          ))}
        </div>
      </section>
    </>
  );
}

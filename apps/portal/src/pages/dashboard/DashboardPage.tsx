import type { DashboardProjectRow, TrackedProjectStatus } from '@wroom/shared';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { ProjectStatusPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useDashboard } from '../../features/dashboard/api';
import { humanise, money, relativeDate } from '../../lib/format';

/**
 * Home. Answers "what is the state of everything" without opening a record:
 * how many projects sit in each status, what they cost, and which have gone
 * quiet. Every figure comes from the single `/api/dashboard` read.
 */

function StatusTile({ status, count }: { status: TrackedProjectStatus; count: number }) {
  return (
    <Link
      to={`/projects?status=${status}`}
      className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {humanise(status)}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{count}</p>
    </Link>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function QuietProjectRow({ project }: { project: DashboardProjectRow }) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{project.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {relativeDate(project.lastActivityAt)} · {project.percentComplete}% complete
        </p>
      </div>
      <ProjectStatusPill status={project.status} />
    </Link>
  );
}

export function DashboardPage() {
  const dashboard = useDashboard();

  if (dashboard.isPending) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <LoadingState label="Loading your projects…" />
      </>
    );
  }

  if (dashboard.isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      </>
    );
  }

  const { statusCounts, totals, leastRecentlyActive } = dashboard.data;

  if (totals.projects === 0) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          title="Nothing is being tracked yet"
          whatToDoNext="Create your first project and this page will show what each one costs, how far along it is, and what has gone quiet."
          action={
            <Link to="/projects/new">
              <Button>Create your first project</Button>
            </Link>
          }
        />
      </>
    );
  }

  const statuses = Object.keys(statusCounts) as TrackedProjectStatus[];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${totals.projects} project${totals.projects === 1 ? '' : 's'} tracked`}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">By status</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statuses.map((status) => (
            <StatusTile key={status} status={status} count={statusCounts[status]} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Spend</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Monthly cost" value={money(totals.monthlyCostAud)} hint="recurring, per month" />
          <Stat label="Total spend" value={money(totals.totalSpendAud)} hint="to date" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Least recently active</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {leastRecentlyActive.map((project) => (
            <QuietProjectRow key={project._id} project={project} />
          ))}
        </div>
      </section>
    </>
  );
}

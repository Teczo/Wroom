import { PROJECT_STATUSES } from '@wroom/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill, ProjectStatusPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useProjects } from '../../features/projects/api';
import { humanise, money, relativeDate } from '../../lib/format';

export function ProjectsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const projects = useProjects({
    status: status || undefined,
    q: search.trim() || undefined,
  });

  const isFiltered = status !== '' || search.trim() !== '';

  return (
    <>
      <PageHeader
        title="Projects"
        actions={
          <Link to="/projects/new">
            <Button>New project</Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClasses}
          placeholder="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search projects"
        />
        <select
          className={`${inputClasses} sm:w-48`}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {humanise(value)}
            </option>
          ))}
        </select>
      </div>

      {projects.isPending ? <LoadingState label="Loading projects…" /> : null}

      {projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : null}

      {projects.isSuccess && projects.data.items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            title="Nothing matches those filters"
            whatToDoNext="Clear the search or pick a different status to see the rest of your projects."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No projects yet"
            whatToDoNext="Add your first project. You will pick its type first, which decides what the rest of the form asks for."
            action={
              <Link to="/projects/new">
                <Button>New project</Button>
              </Link>
            }
          />
        )
      ) : null}

      {projects.isSuccess && projects.data.items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.data.items.map((project) => (
            <li key={project._id}>
              <Link
                to={`/projects/${project._id}`}
                className="block h-full rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                    {project.name}
                  </p>
                  <ProjectStatusPill status={project.status} />
                </div>

                {project.shortDescription ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {project.shortDescription}
                  </p>
                ) : null}

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width: `${project.rollup.percentComplete}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{project.rollup.percentComplete}% complete</span>
                  <span aria-hidden>·</span>
                  <span>{money(project.rollup.monthlyCostAud)}/mo</span>
                  <span aria-hidden>·</span>
                  <span>{relativeDate(project.rollup.lastActivityAt)}</span>
                  {project.portfolio.publishedAt ? <Pill label="Published" tone="green" /> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

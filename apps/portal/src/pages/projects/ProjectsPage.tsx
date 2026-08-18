import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { Pill, ProjectStatusPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ProjectFilters, useProjectFilters } from '../../features/projects/ProjectFilters';
import { useProjects } from '../../features/projects/api';
import { money, relativeDate } from '../../lib/format';

export function ProjectsPage() {
  const { filters, hasFilters, clearAll } = useProjectFilters();
  const projects = useProjects(filters);

  const isFiltered = hasFilters;

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

      <ProjectFilters total={projects.data?.meta.total} />

      {projects.isPending ? <LoadingState label="Loading projects…" /> : null}

      {projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : null}

      {projects.isSuccess && projects.data.items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            title="Nothing matches these filters"
            whatToDoNext="No project matches every filter you have on. Clear them to see the rest of your projects."
            action={
              <Button variant="secondary" onClick={clearAll}>
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
            <li
              key={project._id}
              className={`flex h-full flex-col rounded-xl border hover:border-slate-300 hover:shadow-sm ${
                project.status === 'archived'
                  ? 'border-dashed border-slate-300 bg-slate-50 opacity-75'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Link to={`/projects/${project._id}`} className="block flex-1 p-4 pb-0">
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

              {/* Outside the card link — an anchor cannot be nested in an anchor. */}
              <p className="flex items-center gap-1.5 px-4 pb-4 pt-2 text-xs">
                {project.primaryEnvironment?.publicUrl ? (
                  <>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                      {project.primaryEnvironment.name}
                    </span>
                    <a
                      href={project.primaryEnvironment.publicUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate text-blue-700 underline underline-offset-2 hover:text-blue-900"
                    >
                      {project.primaryEnvironment.publicUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </>
                ) : (
                  <span className="text-slate-400">No environment URL</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

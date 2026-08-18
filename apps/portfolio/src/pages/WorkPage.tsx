import { Link } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { usePublishedProjects } from '../features/work/api';

export function WorkPage() {
  const projects = usePublishedProjects();

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Selected work
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Products and platforms built end to end — XR, mobile, and the systems behind them.
        </p>
      </header>

      {projects.isPending ? <LoadingState label="Loading work…" /> : null}

      {projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : null}

      {projects.isSuccess && projects.data.items.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          whatToDoNext="Work appears here once it has been published from the portal. Check back shortly."
        />
      ) : null}

      {projects.isSuccess && projects.data.items.length > 0 ? (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {projects.data.items.map((project) => (
            <li key={project._id}>
              <Link
                to={`/work/${project.slug}`}
                className="group block h-full overflow-hidden rounded-2xl border border-slate-200 transition-colors hover:border-slate-400"
              >
                {project.heroImage ? (
                  <img
                    src={project.heroImage.url}
                    alt={project.heroImage.alt}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video w-full bg-slate-100" />
                )}

                <div className="p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {project.productName}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{project.name}</h2>
                  {project.shortDescription ? (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                      {project.shortDescription}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

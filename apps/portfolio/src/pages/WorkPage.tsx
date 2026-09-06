import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { CategorySections } from '../features/work/CategorySections';
import { usePublishedProjects } from '../features/work/api';

/**
 * The work index — everything published, filed under the chip each project
 * carries.
 *
 * The grouping, the sections and the rows inside them live in
 * `features/work/CategorySections.tsx`; this page is the header, the four
 * states (§7) and the container.
 *
 * The heading and the line under it are still written here rather than read
 * from `siteContent`, which has no `work` key to read them from. That is a
 * standing gap, not a new one.
 */
export function WorkPage() {
  const projects = usePublishedProjects();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Selected work
        </h1>
        <p className="mt-3 text-base text-muted">
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
        <div className="mt-12">
          <CategorySections projects={projects.data.items} />
        </div>
      ) : null}
    </div>
  );
}

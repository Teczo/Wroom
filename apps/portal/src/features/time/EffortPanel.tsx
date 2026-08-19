import { ErrorState, LoadingState } from '../../components/StateViews';
import { hours as formatHours, humanise, money } from '../../lib/format';
import { useProjectTimeSummary } from './summary';

/**
 * Effort, kept apart from spend on purpose.
 *
 * Hosting spend is money that left the account. Time cost is what the hours
 * would have been worth — it has never been paid to anyone, and it is not part
 * of any total by default. The heading says as much, because a figure in
 * dollars sitting next to real spend invites exactly the wrong reading.
 */

/** A dash, not $0.00 — uncosted hours and free work are different things. */
function cost(value: number | null): string {
  return value === null ? '—' : money(value);
}

export function EffortPanel({ projectId }: { projectId: string }) {
  const summary = useProjectTimeSummary(projectId);

  if (summary.isPending) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <LoadingState label="Loading effort…" />
      </section>
    );
  }

  if (summary.isError) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      </section>
    );
  }

  const { totalHours, timeCostAud, uncosted, byActivity, byFeature } = summary.data;

  if (totalHours === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Effort</h3>
        <p className="mt-1 text-sm text-slate-500">
          No hours logged yet. Log them on the Time tab and this shows where they went.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/40">
      <div className="border-b border-violet-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Effort</h3>
        <p className="mt-0.5 text-xs text-slate-600">
          What the work took. Separate from spend — time cost is what the hours are worth, not
          money that left an account, and it is not part of any total.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Hours</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatHours(totalHours)}</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Time cost
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {uncosted ? '—' : money(timeCostAud)}
            </p>
            {uncosted ? (
              <p className="mt-0.5 text-xs text-slate-500">no rate on these hours</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">By activity</p>
        <ul className="mt-2 space-y-1">
          {byActivity.map((row) => (
            <li
              key={row.activity}
              className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-slate-700">{humanise(row.activity)}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-slate-600">{formatHours(row.hours)}</span>
                <span className="w-20 text-right font-medium text-slate-900">
                  {cost(row.costAud)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {byFeature.length > 0 ? (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              By feature
            </p>
            <ul className="mt-2 space-y-1">
              {byFeature.map((row) => (
                <li
                  key={row.featureId ?? 'unassigned'}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {row.ref ? (
                      <>
                        <span className="font-mono text-xs text-slate-500">{row.ref}</span>{' '}
                        <span className="text-slate-700">{row.title}</span>
                      </>
                    ) : (
                      <span className="text-slate-500">
                        {row.title ?? 'Not against a feature'}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-slate-600">{formatHours(row.hours)}</span>
                    <span className="w-20 text-right font-medium text-slate-900">
                      {cost(row.costAud)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

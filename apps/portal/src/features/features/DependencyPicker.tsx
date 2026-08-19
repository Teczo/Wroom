import type { Feature } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { ApiRequestError } from '../../lib/api';
import { hours as hoursLabel, money } from '../../lib/format';
import { useFeatureTimeSummary } from '../time/summary';
import { useUpdateFeature } from './api';

/**
 * What a feature waits on, and what waits on it.
 *
 * WRM-025 never built a feature edit form, so this lives on the board card
 * rather than in one. Cycles and cross-project picks are refused by the API;
 * its message is shown as-is because it names the features involved.
 */
export function DependencyPicker({
  projectId,
  feature,
  candidates,
}: {
  projectId: string;
  feature: Feature;
  candidates: Feature[];
}) {
  const update = useUpdateFeature(projectId);
  const [selected, setSelected] = useState<string[]>(feature.dependsOnFeatureIds);

  // Cost lives here rather than on the card — a card is for deciding what to
  // pick up next, and a dollar figure is not part of that decision.
  const time = useFeatureTimeSummary(feature._id);

  const dependencies = feature.dependencies ?? [];
  const dependents = feature.dependents ?? [];
  const others = candidates.filter((candidate) => candidate._id !== feature._id);

  const changed =
    selected.length !== feature.dependsOnFeatureIds.length ||
    selected.some((id) => !feature.dependsOnFeatureIds.includes(id));

  function toggle(id: string): void {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {time.data && time.data.totalHours > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Effort</p>
          <p className="mt-1 text-xs text-slate-700">
            {hoursLabel(time.data.totalHours)} ·{' '}
            {time.data.uncosted ? (
              <span className="text-slate-500">no rate on these hours</span>
            ) : (
              money(time.data.timeCostAud)
            )}
          </p>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Waits on
        </p>
        {dependencies.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">Nothing</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {dependencies.map((dependency) => (
              <li key={dependency._id} className="flex items-center gap-1.5 text-xs">
                <span className="font-mono text-slate-500">{dependency.ref}</span>
                <span className="truncate text-slate-700">{dependency.title}</span>
                {dependency.status === 'done' ? (
                  <Pill label="done" tone="green" />
                ) : (
                  <Pill label={dependency.status} tone="amber" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Blocks
        </p>
        {dependents.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">Nothing</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {dependents.map((dependent) => (
              <li key={dependent._id} className="flex items-center gap-1.5 text-xs">
                <span className="font-mono text-slate-500">{dependent.ref}</span>
                <span className="truncate text-slate-700">{dependent.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {others.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Depends on
          </p>
          <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
            {others.map((candidate) => (
              <label
                key={candidate._id}
                className="flex min-h-9 items-center gap-2 text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-slate-300"
                  checked={selected.includes(candidate._id)}
                  onChange={() => toggle(candidate._id)}
                />
                <span className="font-mono text-slate-500">{candidate.ref}</span>
                <span className="truncate">{candidate.title}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No other features to depend on yet.</p>
      )}

      {update.isError ? (
        <p className="text-xs text-red-700">
          {update.error instanceof ApiRequestError
            ? update.error.message
            : 'That could not be saved.'}
        </p>
      ) : null}

      {changed ? (
        <div className="flex gap-2">
          <Button
            className="min-h-9 text-xs"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ id: feature._id, dependsOnFeatureIds: selected })
            }
          >
            {update.isPending ? 'Saving…' : 'Save dependencies'}
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 text-xs"
            onClick={() => setSelected(feature.dependsOnFeatureIds)}
          >
            Reset
          </Button>
        </div>
      ) : null}
    </div>
  );
}

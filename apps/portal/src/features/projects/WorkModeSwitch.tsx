import { WORK_MODES, type Project, type WorkMode } from '@wroom/shared';

import { ApiRequestError } from '../../lib/api';
import { useUpdateProject } from './api';

const labels: Record<WorkMode, string> = {
  managed: 'Managed',
  'hands-off': 'Hands-off',
};

/**
 * Managed is planned in feature cards; hands-off in one CLAUDE.md. Either way
 * round can be undone — switching hides the Features tab and the board, and
 * deletes nothing on them.
 */
export function WorkModeSwitch({ project }: { project: Project }) {
  const update = useUpdateProject(project._id);
  // Projects saved before work modes existed come back without the field.
  const current: WorkMode = project.workMode ?? 'managed';

  return (
    <div className="mb-4 flex flex-col gap-1">
      <div
        role="radiogroup"
        aria-label="Work mode"
        className="inline-flex w-full rounded-lg bg-slate-100 p-1 sm:w-auto sm:self-start"
      >
        {WORK_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={current === mode}
            disabled={update.isPending}
            onClick={() => {
              if (mode !== current) update.mutate({ workMode: mode });
            }}
            className={`min-h-9 flex-1 rounded-md px-4 text-sm font-medium sm:flex-none ${
              current === mode
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            } disabled:cursor-wait`}
          >
            {labels[mode]}
          </button>
        ))}
      </div>
      {update.isError ? (
        <p role="alert" className="text-xs text-red-700">
          {update.error instanceof ApiRequestError
            ? update.error.message
            : 'The mode did not change — the server could not be reached.'}
        </p>
      ) : null}
    </div>
  );
}

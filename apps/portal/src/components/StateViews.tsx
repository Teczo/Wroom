import type { ReactNode } from 'react';

import { ApiRequestError } from '../lib/api';
import { Button } from './Button';

/**
 * Loading, empty and error, handled explicitly. Every list view in the portal
 * uses these three so no screen can quietly render nothing.
 */

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
      />
      <span role="status">{label}</span>
    </div>
  );
}

/**
 * An empty state says what to do next. "No data" is not an acceptable message
 * here — `action` is what makes the screen useful.
 */
export function EmptyState({
  title,
  whatToDoNext,
  action,
}: {
  title: string;
  whatToDoNext: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-base font-medium text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{whatToDoNext}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiRequestError
      ? error.message
      : 'The server could not be reached. Check that the API is running.';

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <p className="text-sm font-medium text-red-900">That did not load</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

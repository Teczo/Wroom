import { ApiRequestError } from '../lib/api';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-sm text-slate-500">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
      />
      <span role="status">{label}</span>
    </div>
  );
}

export function EmptyState({ title, whatToDoNext }: { title: string; whatToDoNext: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-base font-medium text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{whatToDoNext}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiRequestError ? error.message : 'This page could not be loaded right now.';

  return (
    <div className="py-16 text-center">
      <p className="text-base font-medium text-slate-900">Something went wrong</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-6 min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

import { ApiRequestError } from '../lib/api';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-sm text-muted">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-border border-t-slate-900"
      />
      <span role="status">{label}</span>
    </div>
  );
}

export function EmptyState({ title, whatToDoNext }: { title: string; whatToDoNext: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-base font-medium text-fg">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{whatToDoNext}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiRequestError ? error.message : 'This page could not be loaded right now.';

  return (
    <div className="py-16 text-center">
      <p className="text-base font-medium text-fg">Something went wrong</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-6 min-h-11 rounded-lg bg-accent px-5 font-heading text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

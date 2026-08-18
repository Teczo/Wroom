import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { humanise, shortDate } from '../../lib/format';
import { CredentialPanel } from './CredentialPanel';
import { useProjectCredentials } from './api';
import { byUrgency, expiryLabel, expiryState } from './expiry';

/** This project's credentials, most urgent first. */
export function ProjectCredentials({ projectId }: { projectId: string }) {
  const credentials = useProjectCredentials(projectId);
  const [adding, setAdding] = useState(false);

  const items = [...(credentials.data?.items ?? [])].sort(byUrgency);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Credentials</h3>
        <Button variant="secondary" className="min-h-9 text-xs" onClick={() => setAdding(true)}>
          Add credential
        </Button>
      </div>

      {credentials.isPending ? (
        <div className="p-4">
          <LoadingState label="Loading credentials…" />
        </div>
      ) : null}

      {credentials.isError ? (
        <div className="p-4">
          <ErrorState error={credentials.error} onRetry={() => void credentials.refetch()} />
        </div>
      ) : null}

      {credentials.isSuccess && items.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="Nothing recorded for this project"
            whatToDoNext="This records where a key lives and when it expires, never the key itself. Add the certificate, domain or API key this project depends on."
            action={<Button onClick={() => setAdding(true)}>Add credential</Button>}
          />
        </div>
      ) : null}

      {items.map((credential) => {
        const state = expiryState(credential);

        return (
          <Link
            key={credential._id}
            to={`/credentials/${credential._id}`}
            className={`block border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50 ${
              state === 'expired'
                ? 'border-l-4 border-l-red-500'
                : state === 'due'
                  ? 'border-l-4 border-l-amber-400'
                  : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{credential.label}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {humanise(credential.kind)} · stored in {credential.storedIn}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {state === 'expired' ? (
                  <Pill label={expiryLabel(credential)} tone="red" />
                ) : state === 'due' ? (
                  <Pill label={expiryLabel(credential)} tone="amber" />
                ) : (
                  <span className="text-xs text-slate-500">{expiryLabel(credential)}</span>
                )}
                {credential.expiresAt ? (
                  <span className="text-xs text-slate-400">{shortDate(credential.expiresAt)}</span>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}

      {adding ? (
        <CredentialPanel defaultProjectId={projectId} onClose={() => setAdding(false)} />
      ) : null}
    </section>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { CredentialPanel } from '../../features/credentials/CredentialPanel';
import { useCredential, useDeleteCredential } from '../../features/credentials/api';
import { ApiRequestError } from '../../lib/api';
import { humanise, money, shortDate } from '../../lib/format';
import { ExpiryPill } from './CredentialsPage';

export function CredentialDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const credential = useCredential(id);
  const remove = useDeleteCredential(id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (credential.isPending) {
    return (
      <>
        <PageHeader title="Credential" />
        <LoadingState label="Loading credential…" />
      </>
    );
  }

  if (credential.isError) {
    return (
      <>
        <PageHeader
          title="Credential"
          actions={
            <Link to="/credentials" className="text-sm text-slate-500 hover:text-slate-900">
              Back to credentials
            </Link>
          }
        />
        <ErrorState error={credential.error} onRetry={() => void credential.refetch()} />
      </>
    );
  }

  const data = credential.data;

  const rows = [
    { term: 'Kind', value: humanise(data.kind) },
    { term: 'Stored in', value: data.storedIn },
    { term: 'Expires', value: data.expiresAt ? shortDate(data.expiresAt) : 'No expiry recorded' },
    { term: 'Warn before', value: `${data.alertDaysBefore} days` },
    { term: 'Renewal cost', value: money(data.renewalCostAud) },
    {
      term: 'Last rotated',
      value: data.lastRotatedAt ? shortDate(data.lastRotatedAt) : 'Never recorded',
    },
  ];

  return (
    <>
      <PageHeader
        title={data.label}
        subtitle={humanise(data.kind)}
        actions={
          <div className="flex items-center gap-2">
            <ExpiryPill credential={data} />
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.term}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{row.term}</dt>
                <dd className="mt-0.5 break-words text-sm text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>

          {data.notes ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{data.notes}</p>
            </div>
          ) : null}

          <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            This record points at where the credential is kept. The value itself is not here and
            never will be.
          </p>
        </section>

        <section className="rounded-xl border border-red-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-red-900">Delete this record</h2>
          <p className="mt-1 text-sm text-slate-500">
            Removes the reminder, not the credential itself — whatever is in {data.storedIn} stays
            exactly where it is.
          </p>

          {confirming ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="danger"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(undefined, { onSuccess: () => navigate('/credentials') })
                }
              >
                {remove.isPending ? 'Deleting…' : 'Yes, delete it'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </div>
          ) : (
            <Button variant="secondary" className="mt-4" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          )}

          {remove.isError ? (
            <p className="mt-3 text-sm text-red-600">
              {remove.error instanceof ApiRequestError
                ? remove.error.message
                : 'That could not be deleted.'}
            </p>
          ) : null}
        </section>
      </div>

      {editing ? (
        <CredentialPanel credential={data} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}

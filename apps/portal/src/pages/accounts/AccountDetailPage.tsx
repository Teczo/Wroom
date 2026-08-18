import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { AccountPanel } from '../../features/accounts/AccountPanel';
import { useAccount, useDeleteAccount } from '../../features/accounts/api';
import { vendorLabel } from '../../features/accounts/vendor';
import { ApiRequestError } from '../../lib/api';
import { shortDate } from '../../lib/format';

export function AccountDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const account = useAccount(id);
  const remove = useDeleteAccount(id);
  const [editing, setEditing] = useState(false);
  const [typedLabel, setTypedLabel] = useState('');

  if (account.isPending) {
    return (
      <>
        <PageHeader title="Account" />
        <LoadingState label="Loading account…" />
      </>
    );
  }

  if (account.isError) {
    return (
      <>
        <PageHeader
          title="Account"
          actions={
            <Link to="/accounts" className="text-sm text-slate-500 hover:text-slate-900">
              Back to accounts
            </Link>
          }
        />
        <ErrorState error={account.error} onRetry={() => void account.refetch()} />
      </>
    );
  }

  const data = account.data;

  const blockedBy =
    remove.error instanceof ApiRequestError && remove.error.status === 409
      ? Number(remove.error.details?.serviceCount ?? 0)
      : 0;

  const rows = [
    { term: 'Vendor', value: vendorLabel(data.vendor) },
    { term: 'Login email', value: data.loginEmail },
    { term: 'Account reference', value: data.accountRef || '—' },
    { term: 'Billing owner', value: data.billingOwner || '—' },
    { term: 'Added', value: shortDate(data.createdAt) },
  ];

  return (
    <>
      <PageHeader
        title={data.label}
        subtitle={vendorLabel(data.vendor)}
        actions={
          <div className="flex items-center gap-2">
            {data.isPrimary ? (
              <Pill label="Primary" tone="green" />
            ) : (
              <Pill label="Secondary" tone="amber" />
            )}
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
        </section>

        <section className="rounded-xl border border-red-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-red-900">Delete permanently</h2>
          <p className="mt-1 text-sm text-slate-500">
            This cannot be undone, and is refused while any service is still pointed at this
            account.
          </p>

          <div className="mt-4">
            <Field label={`Type "${data.label}" to confirm`} htmlFor="delete-account-confirm">
              <input
                id="delete-account-confirm"
                className={inputClasses}
                value={typedLabel}
                autoComplete="off"
                onChange={(event) => setTypedLabel(event.target.value)}
              />
            </Field>
          </div>

          <Button
            variant="danger"
            className="mt-4"
            disabled={typedLabel !== data.label || remove.isPending}
            onClick={() => remove.mutate(undefined, { onSuccess: () => navigate('/accounts') })}
          >
            {remove.isPending ? 'Deleting…' : 'Delete this account'}
          </Button>

          {blockedBy > 0 ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-900">
                {blockedBy} {blockedBy === 1 ? 'service is' : 'services are'} still on this account,
                so it cannot be deleted.
              </p>
              <p className="mt-1 text-sm text-red-700">Point those somewhere else first.</p>
            </div>
          ) : null}

          {remove.isError && blockedBy === 0 ? (
            <p className="mt-3 text-sm text-red-600">
              {remove.error instanceof ApiRequestError
                ? remove.error.message
                : 'That could not be deleted.'}
            </p>
          ) : null}
        </section>
      </div>

      {editing ? <AccountPanel account={data} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

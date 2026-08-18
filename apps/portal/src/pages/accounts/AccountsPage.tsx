import type { Account } from '@wroom/shared';
import { VENDORS } from '@wroom/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { AccountPanel } from '../../features/accounts/AccountPanel';
import { useAccounts } from '../../features/accounts/api';
import { vendorLabel } from '../../features/accounts/vendor';

/**
 * The account list. A secondary account is the one that costs you money in the
 * wrong place, so it is marked here rather than left to look identical to the
 * primary until someone opens it.
 */

function AccountRow({ account }: { account: Account }) {
  return (
    <Link
      to={`/accounts/${account._id}`}
      className={`block border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50 ${
        account.isPrimary ? '' : 'border-l-4 border-l-amber-400'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{account.label}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{account.loginEmail}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Pill label={vendorLabel(account.vendor)} tone="blue" />
          {account.isPrimary ? null : <Pill label="Secondary" tone="amber" />}
        </div>
      </div>

      {account.accountRef ? (
        <p className="mt-2 truncate font-mono text-xs text-slate-500">{account.accountRef}</p>
      ) : null}
    </Link>
  );
}

export function AccountsPage() {
  const [vendor, setVendor] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const accounts = useAccounts(vendor || undefined);

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Which vendor account each thing is billed to."
        actions={<Button onClick={() => setPanelOpen(true)}>New account</Button>}
      />

      <div className="mb-5">
        <select
          className={`${inputClasses} sm:w-56`}
          value={vendor}
          onChange={(event) => setVendor(event.target.value)}
          aria-label="Filter by vendor"
        >
          <option value="">All vendors</option>
          {VENDORS.map((value) => (
            <option key={value} value={value}>
              {vendorLabel(value)}
            </option>
          ))}
        </select>
      </div>

      {accounts.isPending ? <LoadingState label="Loading accounts…" /> : null}

      {accounts.isError ? (
        <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
      ) : null}

      {accounts.isSuccess && accounts.data.items.length === 0 ? (
        vendor ? (
          <EmptyState
            title={`No ${vendorLabel(vendor)} accounts`}
            whatToDoNext="Nothing is recorded against this vendor yet. Clear the filter to see the rest, or add one."
            action={
              <Button variant="secondary" onClick={() => setVendor('')}>
                Show all vendors
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No accounts recorded yet"
            whatToDoNext="An account record says which vendor login something is billed to — the main Azure subscription, the test tenant, the App Store account. Add the ones you actually pay for first, and mark which is primary."
            action={<Button onClick={() => setPanelOpen(true)}>Add your first account</Button>}
          />
        )
      ) : null}

      {accounts.isSuccess && accounts.data.items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {accounts.data.items.map((account) => (
            <AccountRow key={account._id} account={account} />
          ))}
        </div>
      ) : null}

      {panelOpen ? <AccountPanel onClose={() => setPanelOpen(false)} /> : null}
    </>
  );
}

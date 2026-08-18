import type { Credential } from '@wroom/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { CredentialPanel } from '../../features/credentials/CredentialPanel';
import { useCredentials } from '../../features/credentials/api';
import { byUrgency, expiryLabel, expiryState } from '../../features/credentials/expiry';
import { useProjects } from '../../features/projects/api';
import { humanise, money, shortDate } from '../../lib/format';

/**
 * Everything that expires, soonest first. Each row is judged against its own
 * `alertDaysBefore`, so a certificate wanting 90 days' notice and a key wanting
 * 7 are flagged at the right moment rather than a shared arbitrary one.
 */

const WINDOWS = [
  { label: 'Everything', value: '' },
  { label: 'Next 30 days', value: '30' },
  { label: 'Next 90 days', value: '90' },
];

export function ExpiryPill({ credential }: { credential: Credential }) {
  const state = expiryState(credential);
  const label = expiryLabel(credential);

  if (state === 'expired') return <Pill label={label} tone="red" />;
  if (state === 'due') return <Pill label={label} tone="amber" />;
  if (state === 'none') return <Pill label={label} tone="neutral" />;
  return <span className="text-xs text-slate-500">{label}</span>;
}

function CredentialRow({
  credential,
  projectName,
}: {
  credential: Credential;
  projectName: string;
}) {
  const state = expiryState(credential);

  return (
    <Link
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
          <p className="mt-0.5 text-xs text-slate-500">
            {humanise(credential.kind)} · {projectName}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            Stored in {credential.storedIn}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <ExpiryPill credential={credential} />
          {credential.expiresAt ? (
            <span className="text-xs text-slate-400">{shortDate(credential.expiresAt)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function CredentialsPage() {
  const [windowDays, setWindowDays] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);

  const credentials = useCredentials(
    windowDays ? { expiringWithinDays: Number(windowDays) } : {},
  );
  const projects = useProjects({ includeArchived: true });

  const projectName = (id: string) =>
    projects.data?.items.find((project) => project._id === id)?.name ?? 'Unknown project';

  const items = [...(credentials.data?.items ?? [])].sort(byUrgency);

  return (
    <>
      <PageHeader
        title="Credentials"
        subtitle="Where each key lives and when it dies. Never the key itself."
        actions={<Button onClick={() => setPanelOpen(true)}>New credential</Button>}
      />

      <div className="mb-5">
        <select
          className={`${inputClasses} sm:w-56`}
          value={windowDays}
          onChange={(event) => setWindowDays(event.target.value)}
          aria-label="Filter by expiry window"
        >
          {WINDOWS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {credentials.isPending ? <LoadingState label="Loading credentials…" /> : null}

      {credentials.isError ? (
        <ErrorState error={credentials.error} onRetry={() => void credentials.refetch()} />
      ) : null}

      {credentials.isSuccess && items.length === 0 ? (
        windowDays ? (
          <EmptyState
            title="Nothing expiring in that window"
            whatToDoNext="No credential expires in this period. Widen it to see the rest."
            action={
              <Button variant="secondary" onClick={() => setWindowDays('')}>
                Show everything
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No credentials recorded yet"
            whatToDoNext="This records where a key lives and when it expires — never the key itself. Add the ones that expire: certificates, domains, API keys, so nothing lapses without warning."
            action={<Button onClick={() => setPanelOpen(true)}>Add your first credential</Button>}
          />
        )
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {items.map((credential) => (
              <CredentialRow
                key={credential._id}
                credential={credential}
                projectName={projectName(credential.projectId)}
              />
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {items.length} recorded ·{' '}
            {money(items.reduce((sum, credential) => sum + credential.renewalCostAud, 0))} to renew
            them all
          </p>
        </>
      ) : null}

      {panelOpen ? <CredentialPanel onClose={() => setPanelOpen(false)} /> : null}
    </>
  );
}

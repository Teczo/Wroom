import { STRIPE_PROJECT_SLUG_KEYS, type StripeSyncResult, type VendorConnection } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import {
  useSaveStripeConnection,
  useStripeConnection,
  useSyncStripe,
} from '../../features/integrations/api';
import { ApiRequestError } from '../../lib/api';
import { relativeDate, shortDate } from '../../lib/format';

/**
 * Vendor connections, and running a sync by hand.
 *
 * The page never asks for a key and has nowhere to put one. What it records is
 * where the key lives; the key itself is read from the server's environment at
 * the moment a sync runs (CLAUDE.md §8).
 */

/** How an invoice says which project it belongs to. Shown so it can be copied. */
const SLUG_KEY = STRIPE_PROJECT_SLUG_KEYS[0];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function ConnectionForm({
  connection,
  onDone,
}: {
  connection: VendorConnection | null;
  onDone: () => void;
}) {
  const save = useSaveStripeConnection();

  const [accountId, setAccountId] = useState(connection?.accountId ?? '');
  const [secretRef, setSecretRef] = useState(connection?.secretRef ?? '');
  const [syncEnabled, setSyncEnabled] = useState(connection?.syncEnabled ?? false);

  const errors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          { accountId, secretRef, authType: 'api-key', syncEnabled },
          { onSuccess: onDone },
        );
      }}
    >
      <Field
        label="Stripe account"
        htmlFor="stripe-account"
        hint="The account id shown in Stripe, e.g. acct_1P… Used for display only."
        error={errors.accountId}
      >
        <input
          id="stripe-account"
          className={inputClasses}
          value={accountId}
          autoComplete="off"
          onChange={(event) => setAccountId(event.target.value)}
        />
      </Field>

      <Field
        label="Where the key lives"
        htmlFor="stripe-secret-ref"
        required
        hint="A pointer, not the key — e.g. kv://teczo/stripe. Wroom reads the key from STRIPE_SECRET_KEY on the server and never stores it."
        error={errors.secretRef}
      >
        <input
          id="stripe-secret-ref"
          className={inputClasses}
          value={secretRef}
          placeholder="kv://teczo/stripe"
          autoComplete="off"
          onChange={(event) => setSecretRef(event.target.value)}
          required
        />
      </Field>

      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          checked={syncEnabled}
          onChange={(event) => setSyncEnabled(event.target.checked)}
        />
        Allow syncing
      </label>

      {save.isError ? (
        <p className="text-sm text-red-600">
          {errorMessage(save.error, 'That could not be saved.')}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={save.isPending || secretRef.trim() === ''}>
          {save.isPending ? 'Saving…' : 'Save connection'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

/**
 * What the run did, shown from the response and not stored.
 *
 * The unmatched list is the point of it: those invoices are real money that
 * landed nowhere, and each row carries what is needed to fix the metadata in
 * Stripe and run it again.
 */
function SyncSummary({ result }: { result: StripeSyncResult }) {
  return (
    <div className="border-t border-slate-100">
      <div className="flex flex-wrap items-baseline justify-between gap-2 p-4 pb-2">
        <h3 className="text-sm font-semibold text-slate-900">Last run</h3>
        <p className="text-xs text-slate-500">
          {result.invoicesRead} invoice{result.invoicesRead === 1 ? '' : 's'} read
          {result.since ? ` since ${shortDate(result.since)}` : ' — everything, first run'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
        <Count label="Imported" value={result.imported} tone="text-emerald-700" />
        <Count label="Updated" value={result.updated} tone="text-blue-700" />
        <Count
          label="Unmatched"
          value={result.skippedUnmatched}
          tone={result.skippedUnmatched > 0 ? 'text-amber-700' : 'text-slate-900'}
        />
        <Count
          label="Failed"
          value={result.failed}
          tone={result.failed > 0 ? 'text-red-700' : 'text-slate-900'}
        />
      </div>

      {result.skippedNotBillable > 0 ? (
        <p className="px-4 pt-3 text-xs text-slate-500">
          {result.skippedNotBillable} draft or void invoice
          {result.skippedNotBillable === 1 ? ' was' : 's were'} left out — neither money in nor
          money owed.
        </p>
      ) : null}

      {result.failures.length > 0 ? (
        <ul className="px-4 pt-3 text-xs text-red-700">
          {result.failures.map((failure) => (
            <li key={failure}>{failure}</li>
          ))}
        </ul>
      ) : null}

      {result.unmatched.length > 0 ? (
        <div className="p-4">
          <p className="text-sm font-medium text-slate-900">
            Not imported — no project to attach them to
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Nothing was written for these. Add <code className="font-mono">{SLUG_KEY}</code> to the
            invoice metadata in Stripe, set it to the project&rsquo;s slug, and run the sync again.
          </p>

          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {result.unmatched.map((invoice) => (
              <li key={invoice.invoiceId} className="p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs text-slate-900">{invoice.invoiceId}</span>
                  <Pill
                    label={invoice.reason === 'no-slug' ? 'no project slug' : 'unknown slug'}
                    tone="amber"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {invoice.customerRef || 'no customer on the invoice'}
                  {invoice.slug ? (
                    <>
                      {' · '}
                      metadata says <code className="font-mono">{invoice.slug}</code>, which is not
                      a project here
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.unmatched.length === 0 && result.failed === 0 ? (
        <p className="p-4 pt-3 text-xs text-slate-500">
          Every billable invoice found a project.
          {result.projectsAffected > 0
            ? ` ${result.projectsAffected} project${
                result.projectsAffected === 1 ? '' : 's'
              } had totals recalculated.`
            : ''}
        </p>
      ) : null}
    </div>
  );
}

function StripeCard({ connection }: { connection: VendorConnection }) {
  const sync = useSyncStripe();
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-900">Stripe</h2>
            {connection.syncEnabled ? (
              <Pill label="Sync on" tone="green" />
            ) : (
              <Pill label="Sync off" tone="neutral" />
            )}
            {connection.lastSyncStatus === 'failed' ? (
              <Pill label="Last run failed" tone="red" />
            ) : null}
          </div>

          <p className="mt-1 font-mono text-xs text-slate-500">
            {connection.accountId || 'no account id recorded'}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Last synced {relativeDate(connection.lastSyncAt)}
            {connection.lastSyncAt ? ` · ${shortDate(connection.lastSyncAt)}` : ''}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Key lives at <code className="font-mono">{connection.secretRef}</code>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            className="min-h-9 text-xs"
            disabled={sync.isPending || !connection.syncEnabled}
            onClick={() => sync.mutate()}
          >
            {sync.isPending ? 'Syncing…' : 'Sync now'}
          </Button>
          <Button
            variant="secondary"
            className="min-h-9 text-xs"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? 'Close' : 'Edit'}
          </Button>
        </div>
      </div>

      {connection.syncEnabled ? null : (
        <p className="px-4 pb-4 text-xs text-slate-500">
          Syncing is switched off, so &ldquo;Sync now&rdquo; is unavailable. Turn it on under Edit.
        </p>
      )}

      {editing ? (
        <div className="border-t border-slate-100 p-4">
          <ConnectionForm connection={connection} onDone={() => setEditing(false)} />
        </div>
      ) : null}

      {/* The stored error from a previous run, which survives a page reload. */}
      {connection.lastSyncError && !sync.isError && !sync.isSuccess ? (
        <div className="border-t border-slate-100 p-4">
          <p className="text-sm font-medium text-red-900">The last run did not finish</p>
          <p className="mt-1 text-sm text-red-700">{connection.lastSyncError}</p>
        </div>
      ) : null}

      {/* What this run returned. Named plainly, and never carrying the key. */}
      {sync.isError ? (
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-900">Nothing was imported</p>
            <p className="mt-1 text-sm text-red-700">
              {errorMessage(
                sync.error,
                'The sync could not be run. Check that the API is running.',
              )}
            </p>
          </div>
        </div>
      ) : null}

      {sync.isSuccess ? <SyncSummary result={sync.data} /> : null}
    </section>
  );
}

export function IntegrationsPage() {
  const connection = useStripeConnection();
  const [connecting, setConnecting] = useState(false);

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Pull money in from Stripe instead of typing it. Read-only — Wroom never changes anything in Stripe."
      />

      {connection.isPending ? <LoadingState label="Loading connections…" /> : null}

      {connection.isError ? (
        <ErrorState error={connection.error} onRetry={() => void connection.refetch()} />
      ) : null}

      {connection.isSuccess && !connection.data ? (
        connecting ? (
          <ConnectionForm connection={null} onDone={() => setConnecting(false)} />
        ) : (
          <EmptyState
            title="Stripe is not connected"
            whatToDoNext={`Connect Stripe and revenue stops being something you have to remember to type. Wroom imports invoices tagged with a project slug in their metadata — set ${SLUG_KEY} on an invoice in Stripe and it lands against that project. You will be asked where the key lives, never for the key itself.`}
            action={<Button onClick={() => setConnecting(true)}>Connect Stripe</Button>}
          />
        )
      ) : null}

      {connection.isSuccess && connection.data ? (
        <StripeCard connection={connection.data} />
      ) : null}
    </div>
  );
}

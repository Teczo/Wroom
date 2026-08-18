import type { Credential } from '@wroom/shared';
import { CREDENTIAL_KINDS } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';
import { useAccounts } from '../accounts/api';
import { useProjects } from '../projects/api';
import { useCreateCredential, useUpdateCredential } from './api';

/**
 * Create and edit a credential record.
 *
 * There is no field here that could hold a key, and there is not going to be
 * one — the API refuses a body that carries `value`, `token`, `secret` or
 * anything else shaped like a secret. `storedIn` says where to go and look.
 */

type Props = {
  credential?: Credential;
  defaultProjectId?: string;
  onClose: () => void;
};

function dateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

export function CredentialPanel({ credential, defaultProjectId, onClose }: Props) {
  const create = useCreateCredential();
  const update = useUpdateCredential(credential?._id ?? '');
  const save = credential ? update : create;

  const projects = useProjects({ includeArchived: true });
  const accounts = useAccounts();

  const [projectId, setProjectId] = useState(
    credential?.projectId ?? defaultProjectId ?? '',
  );
  const [label, setLabel] = useState(credential?.label ?? '');
  const [kind, setKind] = useState<string>(credential?.kind ?? 'api-key');
  const [storedIn, setStoredIn] = useState(credential?.storedIn ?? '');
  const [accountId, setAccountId] = useState(credential?.accountId ?? '');
  const [expiresAt, setExpiresAt] = useState(dateInput(credential?.expiresAt ?? null));
  const [renewalCostAud, setRenewalCostAud] = useState(String(credential?.renewalCostAud ?? 0));
  const [alertDaysBefore, setAlertDaysBefore] = useState(String(credential?.alertDaysBefore ?? 30));
  const [lastRotatedAt, setLastRotatedAt] = useState(dateInput(credential?.lastRotatedAt ?? null));
  const [notes, setNotes] = useState(credential?.notes ?? '');

  const fieldErrors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-900/40">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {credential ? 'Edit credential' : 'New credential'}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <form
          className="space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(
              {
                projectId,
                label,
                kind,
                storedIn,
                accountId: accountId || null,
                expiresAt: expiresAt || null,
                renewalCostAud: Number(renewalCostAud) || 0,
                alertDaysBefore: Number(alertDaysBefore) || 0,
                lastRotatedAt: lastRotatedAt || null,
                notes,
              },
              { onSuccess: onClose },
            );
          }}
        >
          <Field label="Project" htmlFor="cred-project" required error={fieldErrors.projectId}>
            <select
              id="cred-project"
              className={inputClasses}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              required
            >
              <option value="">Choose a project…</option>
              {(projects.data?.items ?? []).map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Label"
            htmlFor="cred-label"
            hint="What it is — “SWMS Claude API key”, “teczo.com.au certificate”."
            required
            error={fieldErrors.label}
          >
            <input
              id="cred-label"
              className={inputClasses}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
            />
          </Field>

          <Field label="Kind" htmlFor="cred-kind" required error={fieldErrors.kind}>
            <select
              id="cred-kind"
              className={inputClasses}
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              {CREDENTIAL_KINDS.map((value) => (
                <option key={value} value={value}>
                  {humanise(value)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Stored in"
            htmlFor="cred-stored"
            hint="Where to go and look for it — “Azure Key Vault”, “1Password”, “Render env”. A location, never the value itself."
            required
            error={fieldErrors.storedIn}
          >
            <input
              id="cred-stored"
              className={inputClasses}
              value={storedIn}
              onChange={(event) => setStoredIn(event.target.value)}
              required
            />
          </Field>

          <Field label="Account" htmlFor="cred-account" error={fieldErrors.accountId}>
            <select
              id="cred-account"
              className={inputClasses}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="">Not recorded</option>
              {(accounts.data?.items ?? []).map((account) => (
                <option key={account._id} value={account._id}>
                  {account.label}
                  {account.isPrimary ? '' : ' (secondary)'}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expires" htmlFor="cred-expires" error={fieldErrors.expiresAt}>
              <input
                id="cred-expires"
                type="date"
                className={inputClasses}
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </Field>

            <Field
              label="Warn me this many days before"
              htmlFor="cred-alert"
              error={fieldErrors.alertDaysBefore}
            >
              <input
                id="cred-alert"
                type="number"
                min={0}
                className={inputClasses}
                value={alertDaysBefore}
                onChange={(event) => setAlertDaysBefore(event.target.value)}
              />
            </Field>

            <Field
              label="Renewal cost (AUD)"
              htmlFor="cred-cost"
              error={fieldErrors.renewalCostAud}
            >
              <input
                id="cred-cost"
                type="number"
                min={0}
                step="0.01"
                className={inputClasses}
                value={renewalCostAud}
                onChange={(event) => setRenewalCostAud(event.target.value)}
              />
            </Field>

            <Field label="Last rotated" htmlFor="cred-rotated" error={fieldErrors.lastRotatedAt}>
              <input
                id="cred-rotated"
                type="date"
                className={inputClasses}
                value={lastRotatedAt}
                onChange={(event) => setLastRotatedAt(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="cred-notes" error={fieldErrors.notes}>
            <textarea
              id="cred-notes"
              rows={4}
              className={inputClasses}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Never paste the key itself into any field here. Wroom records where it lives and when
            it dies — the API refuses a request that carries a value.
          </p>

          {save.isError ? (
            <p className="text-sm text-red-600">
              {save.error instanceof ApiRequestError
                ? save.error.message
                : 'That could not be saved.'}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={save.isPending || label.trim() === '' || storedIn.trim() === ''}
            >
              {save.isPending ? 'Saving…' : credential ? 'Save changes' : 'Create credential'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

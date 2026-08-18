import type { Account } from '@wroom/shared';
import { VENDORS } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ApiRequestError } from '../../lib/api';
import { vendorLabel } from './vendor';
import { useCreateAccount, useUpdateAccount } from './api';

/**
 * Create and edit, in a panel over the list.
 *
 * There is deliberately no password, key or token field here. An account record
 * says which account something is on; where its secret lives is `credentials`,
 * and even there it is a pointer, never a value.
 */

type Props = {
  /** Absent when creating. */
  account?: Account;
  onClose: () => void;
};

export function AccountPanel({ account, onClose }: Props) {
  const create = useCreateAccount();
  const update = useUpdateAccount(account?._id ?? '');
  const save = account ? update : create;

  const [vendor, setVendor] = useState<string>(account?.vendor ?? 'azure');
  const [label, setLabel] = useState(account?.label ?? '');
  const [loginEmail, setLoginEmail] = useState(account?.loginEmail ?? '');
  const [accountRef, setAccountRef] = useState(account?.accountRef ?? '');
  const [isPrimary, setIsPrimary] = useState(account?.isPrimary ?? false);
  const [billingOwner, setBillingOwner] = useState(account?.billingOwner ?? '');
  const [notes, setNotes] = useState(account?.notes ?? '');

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
            {account ? 'Edit account' : 'New account'}
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
              { vendor, label, loginEmail, accountRef, isPrimary, billingOwner, notes },
              { onSuccess: onClose },
            );
          }}
        >
          <Field label="Vendor" htmlFor="account-vendor" required error={fieldErrors.vendor}>
            <select
              id="account-vendor"
              className={inputClasses}
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
            >
              {VENDORS.map((value) => (
                <option key={value} value={value}>
                  {vendorLabel(value)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Label"
            htmlFor="account-label"
            hint="What you call it — “Teczo main”, “test tenant”."
            required
            error={fieldErrors.label}
          >
            <input
              id="account-label"
              className={inputClasses}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
            />
          </Field>

          <Field
            label="Login email"
            htmlFor="account-email"
            required
            error={fieldErrors.loginEmail}
          >
            <input
              id="account-email"
              type="email"
              className={inputClasses}
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              required
            />
          </Field>

          <Field
            label="Account reference"
            htmlFor="account-ref"
            hint="Subscription id, org id, team slug — whatever the vendor calls it."
            error={fieldErrors.accountRef}
          >
            <input
              id="account-ref"
              className={inputClasses}
              value={accountRef}
              onChange={(event) => setAccountRef(event.target.value)}
            />
          </Field>

          <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300"
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            This is the primary account for this vendor
          </label>

          <Field label="Billing owner" htmlFor="account-billing" error={fieldErrors.billingOwner}>
            <input
              id="account-billing"
              className={inputClasses}
              value={billingOwner}
              onChange={(event) => setBillingOwner(event.target.value)}
            />
          </Field>

          <Field label="Notes" htmlFor="account-notes" error={fieldErrors.notes}>
            <textarea
              id="account-notes"
              rows={4}
              className={inputClasses}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Never put a password, key or token in any field here. Wroom records where a secret
            lives, never the secret itself.
          </p>

          {save.isError ? (
            <p className="text-sm text-red-600">
              {save.error instanceof ApiRequestError
                ? save.error.message
                : 'That could not be saved.'}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending || label.trim() === ''}>
              {save.isPending ? 'Saving…' : account ? 'Save changes' : 'Create account'}
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

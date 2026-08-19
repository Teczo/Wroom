import type { Project } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { money, shortDate } from '../../lib/format';
import {
  useCreateRevenue,
  useDeleteRevenue,
  useMarkRevenuePaid,
  useRevenue,
  type RevenueEntry,
} from './api';

/**
 * Money in, entered by hand.
 *
 * Paid and outstanding are shown as two figures and never added together — one
 * is money that arrived, the other is money someone said they would send. Only
 * the paid total reaches the project rollup, which is why Net can be trusted.
 */

function isOverdue(entry: RevenueEntry): boolean {
  if (entry.paid || !entry.dueAt) return false;
  return new Date(entry.dueAt).getTime() < Date.now();
}

function NewRevenueForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const create = useCreateRevenue(projectId);

  const [description, setDescription] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('invoice');
  const [paid, setPaid] = useState(false);
  const [when, setWhen] = useState('');

  const errors = create.error instanceof ApiRequestError ? create.error.fieldErrors : {};

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          {
            description,
            customerRef,
            amount: Number(amount) || 0,
            currency: 'AUD',
            source,
            paid,
            // Whichever date applies to the state it is in.
            paidAt: paid ? when || new Date().toISOString() : null,
            dueAt: paid ? null : when || null,
          },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="What is it for" htmlFor="rev-description" required error={errors.description}>
        <input
          id="rev-description"
          className={inputClasses}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Customer"
          htmlFor="rev-customer"
          hint="Free text — there is no customer list."
          error={errors.customerRef}
        >
          <input
            id="rev-customer"
            className={inputClasses}
            value={customerRef}
            onChange={(event) => setCustomerRef(event.target.value)}
          />
        </Field>

        <Field label="Amount (AUD)" htmlFor="rev-amount" required error={errors.amount}>
          <input
            id="rev-amount"
            type="number"
            min={0}
            step="0.01"
            className={inputClasses}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>

        <Field label="Source" htmlFor="rev-source" error={errors.source}>
          <select
            id="rev-source"
            className={inputClasses}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="invoice">Invoice</option>
            <option value="manual">Manual</option>
          </select>
        </Field>

        <Field
          label={paid ? 'Paid on' : 'Due on'}
          htmlFor="rev-when"
          required={!paid}
          error={errors.paidAt ?? errors.dueAt}
        >
          <input
            id="rev-when"
            type="date"
            className={inputClasses}
            value={when}
            onChange={(event) => setWhen(event.target.value)}
          />
        </Field>
      </div>

      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          checked={paid}
          onChange={(event) => setPaid(event.target.checked)}
        />
        Already paid
      </label>

      {create.isError ? (
        <p className="text-sm text-red-600">
          {create.error instanceof ApiRequestError
            ? create.error.message
            : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending || description.trim() === ''}>
          {create.isPending ? 'Saving…' : 'Add revenue'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function RevenueRow({ projectId, entry }: { projectId: string; entry: RevenueEntry }) {
  const markPaid = useMarkRevenuePaid(projectId);
  const remove = useDeleteRevenue(projectId);
  const overdue = isOverdue(entry);

  return (
    <div
      className={`border-b border-slate-100 p-4 last:border-0 ${
        overdue ? 'border-l-4 border-l-red-500 bg-red-50' : entry.paid ? '' : 'bg-amber-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{entry.description}</p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {entry.paid ? (
              <Pill label="Paid" tone="green" />
            ) : overdue ? (
              <Pill label="Overdue" tone="red" />
            ) : (
              <Pill label="Outstanding" tone="amber" />
            )}
            {entry.customerRef ? <span>{entry.customerRef}</span> : null}
            <span>
              {entry.paid
                ? `paid ${shortDate(entry.paidAt)}`
                : `due ${shortDate(entry.dueAt)}`}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-medium text-slate-900">{money(entry.amountAud)}</span>
          <div className="flex gap-1">
            {entry.paid ? null : (
              <Button
                variant="ghost"
                className="min-h-9 px-2 text-xs"
                disabled={markPaid.isPending}
                onClick={() => markPaid.mutate(entry._id)}
              >
                Mark paid
              </Button>
            )}
            <Button
              variant="ghost"
              className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
              disabled={remove.isPending}
              onClick={() => remove.mutate(entry._id)}
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RevenuePanel({ project }: { project: Project }) {
  const revenue = useRevenue(project._id);
  const [adding, setAdding] = useState(false);

  const items = revenue.data?.items ?? [];
  const paid = items.filter((entry) => entry.paid);
  const outstanding = items.filter((entry) => !entry.paid);

  const paidTotal = paid.reduce((sum, entry) => sum + entry.amountAud, 0);
  const outstandingTotal = outstanding.reduce((sum, entry) => sum + entry.amountAud, 0);

  // Net uses the rollup's paid revenue and total spend. Time cost is excluded
  // by the resolved decision — hours logged never move this figure.
  const net = project.rollup.totalRevenueAud - project.rollup.totalSpendAud;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Revenue</h3>
        {adding ? null : (
          <Button variant="secondary" className="min-h-9 text-xs" onClick={() => setAdding(true)}>
            Add revenue
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-slate-100 bg-slate-100">
        <div className="bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid</p>
          <p className="mt-1 text-lg font-semibold text-emerald-700">{money(paidTotal)}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Outstanding</p>
          <p className="mt-1 text-lg font-semibold text-amber-700">{money(outstandingTotal)}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              net < 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {money(net)}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">
            paid revenue minus spend — hours are not counted
          </p>
        </div>
      </div>

      {adding ? (
        <div className="border-b border-slate-100 p-4">
          <NewRevenueForm projectId={project._id} onDone={() => setAdding(false)} />
        </div>
      ) : null}

      {revenue.isPending ? (
        <div className="p-4">
          <LoadingState label="Loading revenue…" />
        </div>
      ) : null}

      {revenue.isError ? (
        <div className="p-4">
          <ErrorState error={revenue.error} onRetry={() => void revenue.refetch()} />
        </div>
      ) : null}

      {revenue.isSuccess && items.length === 0 && !adding ? (
        <div className="p-4">
          <EmptyState
            title="No revenue recorded"
            whatToDoNext="This is money in, entered by hand — an invoice you sent, a payment that landed. Add what this project has earned and the Net figure starts meaning something."
            action={<Button onClick={() => setAdding(true)}>Add the first entry</Button>}
          />
        </div>
      ) : null}

      {items.map((entry) => (
        <RevenueRow key={entry._id} projectId={project._id} entry={entry} />
      ))}
    </section>
  );
}

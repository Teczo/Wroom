import { BILLING_CYCLES, VENDORS } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { humanise, money } from '../../lib/format';
import { useCosts, useCreateCost, useDeleteCost } from './api';

function NewCostForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const create = useCreateCost(projectId);
  const [vendor, setVendor] = useState('azure');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');

  const fieldErrors = create.error instanceof ApiRequestError ? create.error.fieldErrors : {};

  return (
    <form
      className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          { vendor, description, amount: Number(amount), currency: 'AUD', billingCycle },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Vendor" htmlFor="cost-vendor" required error={fieldErrors.vendor}>
        <select
          id="cost-vendor"
          className={inputClasses}
          value={vendor}
          onChange={(event) => setVendor(event.target.value)}
        >
          {VENDORS.map((value) => (
            <option key={value} value={value}>
              {humanise(value)}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Description"
        htmlFor="cost-description"
        hint="What the charge is for, e.g. Azure App Service B1."
        required
        error={fieldErrors.description}
      >
        <input
          id="cost-description"
          className={inputClasses}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (AUD)" htmlFor="cost-amount" required error={fieldErrors.amount}>
          <input
            id="cost-amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className={inputClasses}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>

        <Field label="Billing cycle" htmlFor="cost-cycle" required error={fieldErrors.billingCycle}>
          <select
            id="cost-cycle"
            className={inputClasses}
            value={billingCycle}
            onChange={(event) => setBillingCycle(event.target.value)}
          >
            {BILLING_CYCLES.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {create.isError ? (
        <p className="text-sm text-red-600">
          {create.error instanceof ApiRequestError ? create.error.message : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending || description.trim() === '' || amount === ''}>
          {create.isPending ? 'Saving…' : 'Add cost'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function CostsPanel({ projectId }: { projectId: string }) {
  const costs = useCosts(projectId);
  const remove = useDeleteCost(projectId);
  const [isAdding, setIsAdding] = useState(false);

  if (costs.isPending) return <LoadingState label="Loading costs…" />;
  if (costs.isError) return <ErrorState error={costs.error} onRetry={() => void costs.refetch()} />;

  const items = costs.data.items;

  if (items.length === 0 && !isAdding) {
    return (
      <EmptyState
        title="No costs recorded"
        whatToDoNext="Add what this project actually costs to run — hosting, database, domains. Monthly and annual charges roll into the run rate; one-off and usage charges do not."
        action={<Button onClick={() => setIsAdding(true)}>Add a cost</Button>}
      />
    );
  }

  return (
    <div>
      {isAdding ? (
        <NewCostForm projectId={projectId} onDone={() => setIsAdding(false)} />
      ) : (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onClick={() => setIsAdding(true)}>
            Add cost
          </Button>
        </div>
      )}

      <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.map((cost) => (
          <li
            key={cost._id}
            className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{cost.description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Pill label={humanise(cost.vendor)} />
                <span>{humanise(cost.billingCycle)}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-medium text-slate-900">{money(cost.amountAud)}</span>
              <Button
                variant="ghost"
                className="px-2 text-xs"
                disabled={remove.isPending}
                onClick={() => remove.mutate(cost._id)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

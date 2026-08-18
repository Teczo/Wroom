import { TIME_ACTIVITIES } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { hours, humanise, shortDate } from '../../lib/format';
import { useCreateTimeEntry, useDeleteTimeEntry, useTimeEntries } from './api';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function LogTimeForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const create = useCreateTimeEntry(projectId);
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('1');
  const [activity, setActivity] = useState('build');
  const [note, setNote] = useState('');

  const fieldErrors = create.error instanceof ApiRequestError ? create.error.fieldErrors : {};

  return (
    <form
      className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({ date, hours: Number(amount), activity, note }, { onSuccess: onDone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" htmlFor="time-date" required error={fieldErrors.date}>
          <input
            id="time-date"
            type="date"
            className={inputClasses}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>

        <Field label="Hours" htmlFor="time-hours" required error={fieldErrors.hours}>
          <input
            id="time-hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            inputMode="decimal"
            className={inputClasses}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>

        <Field label="Activity" htmlFor="time-activity" required error={fieldErrors.activity}>
          <select
            id="time-activity"
            className={inputClasses}
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
          >
            {TIME_ACTIVITIES.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Note" htmlFor="time-note" error={fieldErrors.note}>
        <input
          id="time-note"
          className={inputClasses}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>

      {create.isError ? (
        <p className="text-sm text-red-600">
          {create.error instanceof ApiRequestError ? create.error.message : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Log time'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function TimePanel({ projectId }: { projectId: string }) {
  const entries = useTimeEntries(projectId);
  const remove = useDeleteTimeEntry(projectId);
  const [isAdding, setIsAdding] = useState(false);

  if (entries.isPending) return <LoadingState label="Loading logged time…" />;
  if (entries.isError) {
    return <ErrorState error={entries.error} onRetry={() => void entries.refetch()} />;
  }

  const items = entries.data.items;

  if (items.length === 0 && !isAdding) {
    return (
      <EmptyState
        title="No time logged"
        whatToDoNext="Log hours by the day — there is no timer to start and stop. Your rate is snapshotted at entry, so changing it later never rewrites past work."
        action={<Button onClick={() => setIsAdding(true)}>Log time</Button>}
      />
    );
  }

  return (
    <div>
      {isAdding ? (
        <LogTimeForm projectId={projectId} onDone={() => setIsAdding(false)} />
      ) : (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onClick={() => setIsAdding(true)}>
            Log time
          </Button>
        </div>
      )}

      <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.map((entry) => (
          <li
            key={entry._id}
            className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {hours(entry.hours)} · {shortDate(entry.date)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Pill label={humanise(entry.activity)} />
                {entry.note ? <span className="truncate">{entry.note}</span> : null}
                {entry.billable ? <Pill label="Billable" tone="green" /> : null}
              </div>
            </div>

            <Button
              variant="ghost"
              className="shrink-0 px-2 text-xs"
              disabled={remove.isPending}
              onClick={() => remove.mutate(entry._id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

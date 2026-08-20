import { ENQUIRY_STATUSES, type Enquiry } from '@wroom/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { EnquiryStatusPill } from '../../components/Pill';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { NotesPanel } from '../../features/notes/NotesPanel';
import { useDeleteEnquiry, useEnquiry, useUpdateEnquiry } from '../../features/enquiries/api';
import { useProducts } from '../../features/products/api';
import { useProjects } from '../../features/projects/api';
import { ApiRequestError } from '../../lib/api';
import { shortDate } from '../../lib/format';

/**
 * One enquiry, everything about it, and the controls for moving it along.
 *
 * The message is rendered as plain text and nothing else. It is the one string
 * in the system written by a stranger, so it is never handed to a markdown
 * renderer and never put anywhere that would parse it as markup.
 */

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

/** The words as they arrived. `whitespace-pre-wrap` keeps the line breaks; React escapes the rest. */
function Message({ body }: { body: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
      {body}
    </p>
  );
}

function StatusControl({ enquiry }: { enquiry: Enquiry }) {
  const update = useUpdateEnquiry(enquiry._id);

  return (
    <div>
      <label htmlFor="enquiry-status" className="block text-sm font-medium text-slate-800">
        Status
      </label>
      <p className="mt-0.5 text-xs text-slate-500">
        new → read → qualified → quoted → won or lost. Spam hides it from the list.
      </p>
      <select
        id="enquiry-status"
        className={`${inputClasses} mt-1.5 sm:w-56`}
        value={enquiry.status}
        disabled={update.isPending}
        onChange={(event) => update.mutate({ status: event.target.value })}
      >
        {ENQUIRY_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      {update.isError ? (
        <p className="mt-2 text-xs text-red-600">
          {errorMessage(update.error, 'That status could not be saved.')}
        </p>
      ) : null}
    </div>
  );
}

function RequirementForm({ enquiry }: { enquiry: Enquiry }) {
  const update = useUpdateEnquiry(enquiry._id);

  const [budgetRange, setBudgetRange] = useState(enquiry.requirement.budgetRange ?? '');
  const [timeline, setTimeline] = useState(enquiry.requirement.timeline ?? '');
  const [interest, setInterest] = useState(enquiry.requirement.interest ?? '');
  const [saved, setSaved] = useState(false);

  const unsaved =
    budgetRange !== (enquiry.requirement.budgetRange ?? '') ||
    timeline !== (enquiry.requirement.timeline ?? '') ||
    interest !== (enquiry.requirement.interest ?? '');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(false);
        update.mutate(
          { requirement: { budgetRange, timeline, interest } },
          { onSuccess: () => setSaved(true) },
        );
      }}
    >
      <p className="text-xs text-slate-500">
        What they said they want, and what you have worked out since. Yours to edit — unlike the
        message, which stays as it arrived.
      </p>

      <Field label="Budget" htmlFor="enquiry-budget">
        <input
          id="enquiry-budget"
          className={inputClasses}
          value={budgetRange}
          onChange={(event) => {
            setBudgetRange(event.target.value);
            setSaved(false);
          }}
        />
      </Field>

      <Field label="Timeline" htmlFor="enquiry-timeline">
        <input
          id="enquiry-timeline"
          className={inputClasses}
          value={timeline}
          onChange={(event) => {
            setTimeline(event.target.value);
            setSaved(false);
          }}
        />
      </Field>

      <Field label="What kind of work" htmlFor="enquiry-interest">
        <input
          id="enquiry-interest"
          className={inputClasses}
          value={interest}
          onChange={(event) => {
            setInterest(event.target.value);
            setSaved(false);
          }}
        />
      </Field>

      {update.isError ? (
        <p className="text-xs text-red-600">
          {errorMessage(update.error, 'That could not be saved.')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={update.isPending || !unsaved}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
        {saved && !unsaved ? <span className="text-xs text-slate-500">Saved</span> : null}
      </div>
    </form>
  );
}

/**
 * Linking a won enquiry to what it became. The link lives on the enquiry, in
 * one direction — nothing is written to the product.
 */
function ConversionPanel({ enquiry }: { enquiry: Enquiry }) {
  const products = useProducts();
  const update = useUpdateEnquiry(enquiry._id);
  const [choice, setChoice] = useState('');

  const linked = products.data?.items.find(
    (product) => product._id === enquiry.convertedToProductId,
  );

  if (enquiry.convertedToProductId) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-sm font-semibold text-emerald-900">This became real work</h2>
        <p className="mt-1 text-sm text-emerald-800">
          Linked to {linked ? <strong>{linked.name}</strong> : 'a product'}. You can see the same
          link from the products list.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/products"
            className="inline-flex min-h-9 items-center rounded-lg bg-white px-3 text-xs font-medium text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Open products
          </Link>
          <Button
            variant="ghost"
            className="min-h-9 text-xs"
            disabled={update.isPending}
            onClick={() => update.mutate({ convertedToProductId: null })}
          >
            {update.isPending ? 'Unlinking…' : 'Unlink'}
          </Button>
        </div>
      </section>
    );
  }

  if (enquiry.status !== 'won') {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Convert to product</h2>
        <p className="mt-1 text-sm text-slate-500">
          Available once this enquiry is marked won. Winning is what the link means, so the status
          comes first.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Convert to product</h2>
      <p className="mt-1 text-sm text-slate-500">
        Point this enquiry at the product it became, so the trail from first contact to real work
        stays visible.
      </p>

      <div className="mt-4 space-y-3">
        <select
          className={inputClasses}
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          aria-label="Product this enquiry became"
        >
          <option value="">Pick a product…</option>
          {(products.data?.items ?? []).map((product) => (
            <option key={product._id} value={product._id}>
              {product.name}
            </option>
          ))}
        </select>

        {update.isError ? (
          <p className="text-xs text-red-600">
            {errorMessage(update.error, 'That could not be linked.')}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={choice === '' || update.isPending}
            onClick={() => update.mutate({ convertedToProductId: choice, status: 'won' })}
          >
            {update.isPending ? 'Linking…' : 'Link to this product'}
          </Button>
          <Link
            to="/products"
            className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Create one first
          </Link>
        </div>
      </div>
    </section>
  );
}

function EnquiryDetail({ enquiry }: { enquiry: Enquiry }) {
  const navigate = useNavigate();
  const remove = useDeleteEnquiry(enquiry._id);
  const projects = useProjects({ includeArchived: true });
  const [confirming, setConfirming] = useState(false);

  const relatedProject = projects.data?.items.find(
    (project) => project._id === enquiry.relatedProjectId,
  );

  const rows = [
    { term: 'Email', value: enquiry.email },
    { term: 'Phone', value: enquiry.phone ?? '—' },
    { term: 'Company', value: enquiry.company ?? '—' },
    { term: 'Came from', value: enquiry.source },
    { term: 'Received', value: shortDate(enquiry.createdAt) },
  ];

  return (
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

        {enquiry.relatedProjectId ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sent from</p>
            {relatedProject ? (
              <Link
                to={`/projects/${relatedProject._id}`}
                className="mt-0.5 inline-block text-sm font-medium text-slate-900 underline"
              >
                {relatedProject.name}
              </Link>
            ) : (
              <p className="mt-0.5 text-sm text-slate-500">
                A project that is no longer here.
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              They were reading this case study when they wrote.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">What they wrote</h2>
        <div className="mt-3">
          <Message body={enquiry.message} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <StatusControl enquiry={enquiry} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">What they need</h2>
        <div className="mt-3">
          <RequirementForm key={enquiry.updatedAt} enquiry={enquiry} />
        </div>
      </section>

      <ConversionPanel enquiry={enquiry} />

      <NotesPanel owner={{ enquiryId: enquiry._id }} />

      <section className="rounded-xl border border-red-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-red-900">Delete this enquiry</h2>
        <p className="mt-1 text-sm text-slate-500">
          Removes it and its notes for good. To get it out of the list without losing it, mark it
          spam instead.
        </p>

        {confirming ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: () => navigate('/enquiries') })}
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
            {errorMessage(remove.error, 'That could not be deleted.')}
          </p>
        ) : null}
      </section>
    </div>
  );
}

export function EnquiryDetailPage() {
  const { id = '' } = useParams();
  const enquiry = useEnquiry(id);

  const backLink = (
    <Link to="/enquiries" className="text-sm text-slate-500 hover:text-slate-900">
      Back to enquiries
    </Link>
  );

  if (enquiry.isPending) {
    return (
      <>
        <PageHeader title="Enquiry" actions={backLink} />
        <LoadingState label="Loading enquiry…" />
      </>
    );
  }

  if (enquiry.isError) {
    return (
      <>
        <PageHeader title="Enquiry" actions={backLink} />
        <ErrorState error={enquiry.error} onRetry={() => void enquiry.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={enquiry.data.name}
        subtitle={enquiry.data.company ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <EnquiryStatusPill status={enquiry.data.status} />
            {backLink}
          </div>
        }
      />
      <EnquiryDetail enquiry={enquiry.data} />
    </>
  );
}

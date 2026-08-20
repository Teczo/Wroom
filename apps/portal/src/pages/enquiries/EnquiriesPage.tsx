import { ENQUIRY_STATUSES, type Enquiry } from '@wroom/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { EnquiryStatusPill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useEnquiries } from '../../features/enquiries/api';
import { relativeDate } from '../../lib/format';

/**
 * Everything that has come in, newest first.
 *
 * Spam is left out unless you go looking for it: it stays as a status rather
 * than being deleted, so the evidence survives, but the inbox is for the
 * things that still need an answer.
 */

/** The first line of the message, which is usually enough to know what it is. */
function firstLine(message: string): string {
  const line = message.split('\n').find((entry) => entry.trim() !== '') ?? '';
  return line.trim();
}

function EnquiryRow({ enquiry }: { enquiry: Enquiry }) {
  return (
    <Link
      to={`/enquiries/${enquiry._id}`}
      className={`block border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50 ${
        enquiry.status === 'new' ? 'border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {enquiry.name}
            {enquiry.company ? (
              <span className="font-normal text-slate-500"> · {enquiry.company}</span>
            ) : null}
          </p>
          {/*
           * Plain text, always. This is a stranger's words and they are never
           * rendered as markup anywhere in the portal.
           */}
          <p className="mt-1 truncate text-sm text-slate-600">{firstLine(enquiry.message)}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <EnquiryStatusPill status={enquiry.status} />
          <span className="text-xs text-slate-400">{relativeDate(enquiry.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function EnquiriesPage() {
  const [status, setStatus] = useState('');
  const enquiries = useEnquiries(status ? { status } : {});

  const items = enquiries.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle="People who got in touch through the portfolio, newest first."
      />

      <div className="mb-5">
        <select
          className={`${inputClasses} sm:w-56`}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">Everything except spam</option>
          {ENQUIRY_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {enquiries.isPending ? <LoadingState label="Loading enquiries…" /> : null}

      {enquiries.isError ? (
        <ErrorState error={enquiries.error} onRetry={() => void enquiries.refetch()} />
      ) : null}

      {enquiries.isSuccess && items.length === 0 ? (
        status ? (
          <EmptyState
            title={`Nothing is ${status}`}
            whatToDoNext="No enquiry has that status right now. Change the filter to see the rest."
          />
        ) : (
          <EmptyState
            title="No enquiries yet"
            whatToDoNext="Enquiries arrive here on their own when someone fills in the contact form on the portfolio. There is nothing to set up — the next person to write to you will appear at the top of this list."
          />
        )
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {items.map((enquiry) => (
              <EnquiryRow key={enquiry._id} enquiry={enquiry} />
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {items.length} shown
            {status ? '' : ' · spam is hidden unless you filter for it'}
          </p>
        </>
      ) : null}
    </>
  );
}

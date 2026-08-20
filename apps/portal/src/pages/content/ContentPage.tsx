import type { SiteContentSummary } from '@wroom/shared';
import { Link } from 'react-router-dom';

import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useSiteContentList } from '../../features/content/api';
import { humanise, relativeDate } from '../../lib/format';

/**
 * The pages whose words live in Wroom rather than in the portfolio's source.
 *
 * Each row says whether anything is live, so the one thing you cannot tell by
 * looking at the public site — that a page has a draft nobody has published —
 * is visible without opening anything.
 */

function ContentRow({ record }: { record: SiteContentSummary }) {
  return (
    <Link
      to={`/content/${record.key}`}
      className="block border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{humanise(record.key)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Edited {relativeDate(record.updatedAt)}</p>
        </div>

        <div className="shrink-0">
          {record.isPublished ? (
            <Pill label="Live" tone="green" />
          ) : (
            <Pill label="Draft only" tone="amber" />
          )}
        </div>
      </div>
    </Link>
  );
}

export function ContentPage() {
  const content = useSiteContentList();
  const items = content.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Content"
        subtitle="The words on the public site's pages. Editing writes a draft — the live site changes only when you publish."
      />

      {content.isPending ? <LoadingState label="Loading content…" /> : null}

      {content.isError ? (
        <ErrorState error={content.error} onRetry={() => void content.refetch()} />
      ) : null}

      {content.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No content records yet"
          whatToDoNext="These pages are seeded, not created here. Run the seed script against this database — npm run seed --workspace @wroom/api — and the about and contact records will appear, both unpublished."
        />
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((record) => (
            <ContentRow key={record.key} record={record} />
          ))}
        </div>
      ) : null}
    </>
  );
}

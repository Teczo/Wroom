import type { SiteContentBody, SiteContentKey } from '@wroom/shared';
import type { ReactNode } from 'react';

import { NotFound } from '../../components/NotFound';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { usePublishedContent } from './api';

/**
 * Loads one `siteContent` record and hands its published copy to the page.
 *
 * All three content pages want the same four answers to the same question, so
 * they are answered once here rather than three times with slight differences.
 * The one that matters is the 404: `/public/content/:key` serves the published
 * sub-document only and 404s when nothing has been published, and from outside
 * a page that has never been published is indistinguishable from a page that
 * does not exist — because that is what it is. Showing the not-found page is
 * the honest reading, and it is the only alternative to inventing copy to fill
 * the gap, which §2 rule 8 forbids.
 */
export function ContentPage({
  contentKey,
  children,
}: {
  contentKey: SiteContentKey;
  children: (content: SiteContentBody) => ReactNode;
}) {
  const content = usePublishedContent(contentKey);

  if (content.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-5">
        <LoadingState />
      </div>
    );
  }

  if (content.isError) {
    if (content.error instanceof ApiRequestError && content.error.status === 404) {
      return <NotFound />;
    }

    return (
      <div className="mx-auto max-w-3xl px-5">
        <ErrorState error={content.error} onRetry={() => void content.refetch()} />
      </div>
    );
  }

  return <>{children(content.data)}</>;
}

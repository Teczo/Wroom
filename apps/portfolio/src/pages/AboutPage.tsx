import type { SiteContentBody } from '@wroom/shared';

import { Markdown } from '../components/Markdown';
import { NotFound } from '../components/NotFound';
import { ErrorState, LoadingState } from '../components/StateViews';
import { usePublishedContent } from '../features/content/api';
import { ApiRequestError } from '../lib/api';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * The about page, written in the portal rather than in this repo.
 *
 * Everything on it comes from the published half of the `about` content
 * record, so changing a sentence is an edit and a publish, not a deploy. Until
 * something is published the API 404s and this renders the not-found page —
 * there is no half-page state where the shell appears with nothing in it.
 */

function About({ content }: { content: SiteContentBody }) {
  useDocumentMeta(content.meta.title || content.title, content.meta.description);

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      {content.title ? (
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {content.title}
        </h1>
      ) : null}

      {content.body ? (
        <div className="mt-8">
          <Markdown>{content.body}</Markdown>
        </div>
      ) : null}
    </article>
  );
}

export function AboutPage() {
  const content = usePublishedContent('about');

  if (content.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-5">
        <LoadingState label="Loading…" />
      </div>
    );
  }

  if (content.isError) {
    // Nothing published reads from outside exactly like a page that does not
    // exist, because that is what it is.
    if (content.error instanceof ApiRequestError && content.error.status === 404) {
      return <NotFound />;
    }

    return (
      <div className="mx-auto max-w-3xl px-5">
        <ErrorState error={content.error} onRetry={() => void content.refetch()} />
      </div>
    );
  }

  return <About content={content.data} />;
}

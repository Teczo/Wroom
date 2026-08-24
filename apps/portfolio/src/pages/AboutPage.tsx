import type { SiteContentBody } from '@wroom/shared';

import { Markdown } from '../components/Markdown';
import { ContentPage } from '../features/content/ContentPage';
import { readAboutData } from '../features/content/pageData';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * The about page, written in the portal rather than in this repo.
 *
 * Everything on it comes from the published half of the `about` record, so
 * changing a sentence is an edit and a publish, not a deploy. The headline is
 * `data.headline` and the narrative is `body` — markdown, because that half of
 * the page is genuinely just writing (docs/DATA_MODEL.md).
 *
 * The portrait is not here. `data.portraitAssetId` points at an `assets`
 * record, which is an operational collection the portfolio may never read
 * (§8, decision 8), and nothing resolves it into the published copy the way
 * `publishService` resolves a project's hero image into the snapshot. Rendering
 * it needs a resolved portrait in `siteContent.published.data` and a public
 * blob copy made at publish — a data model change and a publish change, which
 * are ticket triggers 1 and 4. Reported rather than invented.
 */
function About({ content }: { content: SiteContentBody }) {
  const data = readAboutData(content.data);

  // `title` is the record's own name and is what the portal lists it under.
  // It stands in when the page has no headline yet, so the page is never
  // without an `h1` while still never inventing one.
  const headline = data?.headline || content.title;

  useDocumentMeta(content.meta.title || headline, content.meta.description);

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      {headline ? (
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{headline}</h1>
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
  return <ContentPage contentKey="about">{(content) => <About content={content} />}</ContentPage>;
}

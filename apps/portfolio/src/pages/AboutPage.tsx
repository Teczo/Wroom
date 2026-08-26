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
 * The portrait is `data.portrait` — resolved out of `assets` and copied into
 * the public container by the publish action, because this app may read neither
 * that collection nor a private blob (§6, §8). A page with none set renders the
 * words alone rather than a frame with nothing in it (§7.4).
 */
function About({ content }: { content: SiteContentBody }) {
  const data = readAboutData(content.data);

  // `title` is the record's own name and is what the portal lists it under.
  // It stands in when the page has no headline yet, so the page is never
  // without an `h1` while still never inventing one.
  const headline = data?.headline || content.title;
  const portrait = data?.portrait ?? null;

  useDocumentMeta(content.meta.title || headline, content.meta.description);

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      {headline ? (
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{headline}</h1>
      ) : null}

      {/*
       * The `card` variant: this sits in a column, not across the page, so the
       * hero copy would be several times the pixels the slot can use (§10).
       */}
      {portrait ? (
        <img
          src={portrait.variants?.card ?? portrait.url}
          alt={portrait.alt}
          className="mt-8 w-full rounded-2xl border border-border object-cover sm:float-right sm:ml-8 sm:w-64"
        />
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

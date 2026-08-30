import type { SiteContentBody } from '@wroom/shared';

import { Markdown } from '../components/Markdown';
import { StatsBand } from '../components/StatsBand';
import { AboutBottom } from '../features/about/AboutBottom';
import { AboutIntro } from '../features/about/AboutIntro';
import { AboutLower } from '../features/about/AboutLower';
import { AboutRail } from '../features/about/AboutRail';
import { ContentPage } from '../features/content/ContentPage';
import { readAboutData } from '../features/content/pageData';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * The about page, written in the portal rather than in this repo.
 *
 * Every word, mark and image on it comes from the published half of the `about`
 * record, so changing a sentence is an edit and a publish, not a deploy
 * (§13.6). The narrative is `body` — markdown, because that part of the page is
 * genuinely just writing — and everything markdown cannot express is `data`:
 * the terminal, the tiles, the marks, the counts, the timeline and the closing
 * bar (docs/DATA_MODEL.md).
 *
 * Six blocks, each deciding on its own that it has nothing to show. A record
 * with only a headline written is a page with a headline on it, not a column of
 * empty headings (§7.4).
 *
 * The portrait is `data.portrait` — resolved out of `assets` and copied into
 * the public container by the publish action, because this app may read neither
 * that collection nor a private blob (§6, §8).
 */
function About({ content }: { content: SiteContentBody }) {
  const data = readAboutData(content.data);

  // `title` is the record's own name and is what the portal lists it under. It
  // stands in when the page has no headline yet, so the page is never without
  // an `h1` while still never inventing one.
  const headline = data?.headline || content.title;

  useDocumentMeta(content.meta.title || headline, content.meta.description);

  // A blob that fails the schema the API validated it against is not a page,
  // and guessing at what it meant is worse than showing the writing on its own.
  // The narrative is not in `data`, so it survives that and is still rendered.
  if (!data) {
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

  return (
    <>
      <AboutIntro data={data} headline={headline} body={content.body} />
      <AboutRail data={data} />
      <StatsBand stats={data.stats} marks={data.marks} />
      <AboutLower data={data} />
      <AboutBottom data={data} />
    </>
  );
}

export function AboutPage() {
  return <ContentPage contentKey="about">{(content) => <About content={content} />}</ContentPage>;
}

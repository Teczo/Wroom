import type { SiteContentBody } from '@wroom/shared';

import { Markdown } from '../components/Markdown';
import { Reveal } from '../components/Reveal';
import { ContentPage } from '../features/content/ContentPage';
import { readSkillsData } from '../features/content/pageData';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * What I work with, grouped.
 *
 * Icon and label, and nothing else — no proficiency bar, no percentage, no
 * years. That is a deliberate omission in docs/DATA_MODEL.md rather than a
 * field list waiting to be finished, so there is nothing here to render them
 * from and nothing here that should grow one.
 *
 * The marks themselves are missing for now. `items[].mediaKey` is a
 * `mediaLibrary` key, and the portfolio may not read `mediaLibrary` (§6, §8) —
 * a project's tech grid only has SVG to draw because `publishService` resolves
 * its keys into the snapshot at publish. Nothing does that for `siteContent`,
 * so each tile shows its authored label and no icon. An empty box where the
 * mark will go would be a placeholder, and §7.4 is explicit that a section with
 * nothing behind it renders nothing rather than a frame. When resolution lands
 * the icon fills the tile above the label and this grid does not otherwise
 * change.
 */
function Skills({ content }: { content: SiteContentBody }) {
  const data = readSkillsData(content.data);

  useDocumentMeta(content.meta.title || content.title, content.meta.description);

  // A group with no items is a heading with nothing under it, which is exactly
  // what §7.4 says must not render.
  const groups = (data?.groups ?? []).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
      {content.title ? (
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {content.title}
        </h1>
      ) : null}

      {content.body ? (
        <div className="mt-6 max-w-3xl">
          <Markdown>{content.body}</Markdown>
        </div>
      ) : null}

      {groups.map((group, index) => (
        <Reveal key={group.label} delayMs={index * 60} className="mt-12">
          <section>
            <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-accent">
              {group.label}
            </h2>

            {/*
              * Three per row at 390px (§7.7), widening from `sm` up. Same
              * proportions as the tech grid on a case study, because they are
              * the same kind of object and should not read as two systems.
              */}
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4 md:grid-cols-6">
              {group.items.map((item) => (
                <li
                  key={item.mediaKey}
                  className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-3 text-center"
                >
                  <span className="text-xs font-medium text-fg">
                    {item.label || item.mediaKey}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      ))}
    </div>
  );
}

export function SkillsPage() {
  return <ContentPage contentKey="skills">{(content) => <Skills content={content} />}</ContentPage>;
}

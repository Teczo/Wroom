import { useEffect } from 'react';

/**
 * Writes a page's title and meta description into the document.
 *
 * Both are restored when the page unmounts, so navigating away cannot leave
 * another route wearing this one's title.
 *
 * This runs in the browser, after the bundle has loaded. A crawler that does
 * not execute JavaScript still sees only what is in `index.html` — that is the
 * open question behind WRM-046, it applies to every page equally, and it is
 * not something this route can fix on its own.
 */
function descriptionTag(): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (existing) return existing;

  const created = document.createElement('meta');
  created.name = 'description';
  document.head.append(created);
  return created;
}

export function useDocumentMeta(title: string, description: string): void {
  useEffect(() => {
    const tag = descriptionTag();
    const previousTitle = document.title;
    const previousDescription = tag.content;

    if (title) document.title = title;
    if (description) tag.content = description;

    return () => {
      document.title = previousTitle;
      tag.content = previousDescription;
    };
  }, [title, description]);
}

import type { SiteContentBody } from './types.js';

/**
 * Whether the draft says something different from what is live.
 *
 * One implementation, shared, because "the draft is ahead" is shown in the
 * portal and has to mean the same thing there as the publish action does on
 * the server — a badge that disagreed with what publishing actually changed
 * would be worse than no badge.
 *
 * A record that has never been published is always ahead: there are words in
 * the draft and nothing on the live site.
 */
export function siteContentDiffers(
  draft: SiteContentBody,
  published: SiteContentBody | null,
): boolean {
  if (!published) return true;

  return (
    draft.title !== published.title ||
    draft.body !== published.body ||
    draft.meta.title !== published.meta.title ||
    draft.meta.description !== published.meta.description ||
    // `data` is a different shape per key and is edited as a whole, so it is
    // compared as a whole. Without this a page whose only change was in `data`
    // — a reordered social row, a new discipline — would show as up to date
    // while the live site still served the old one.
    JSON.stringify(editable(draft.data)) !== JSON.stringify(editable(published.data))
  );
}

/**
 * A page's `data` without the half nobody edits.
 *
 * `marks` and `portrait` are resolved by the publish action, so they are on
 * every published record and on no draft. Comparing them would make every page
 * permanently "ahead of what is live", which is the opposite of what the badge
 * is for. `portraitAssetId` is not stripped: choosing a different image *is* an
 * edit, and the badge should say so.
 *
 * It also means the badge tracks the words, not the library or the container:
 * re-approving a mark, or replacing the bytes behind an image, changes what a
 * republish would write without changing the draft, and this comparison will
 * not notice. Publishing again is what picks it up.
 */
function editable(data: Record<string, unknown> | undefined): Record<string, unknown> {
  const { marks: _marks, portrait: _portrait, ...rest } = data ?? {};
  return rest;
}

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
    draft.meta.description !== published.meta.description
  );
}

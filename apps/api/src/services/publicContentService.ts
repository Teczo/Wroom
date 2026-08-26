import { SiteContentModel } from '../models/SiteContent.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * The published half of a content record, and nothing else.
 *
 * This module exists separately from `portfolioService` so each public read
 * stays one collection wide: that one reads `publishedProjects` only, this one
 * reads `siteContent.published` only. Both are on the `/public` allowlist in
 * CLAUDE.md §6.
 *
 * The projection is doing real work, not saving bytes — `draft` is never loaded
 * from the database, so no later change to this file can leak unpublished copy
 * by forgetting to strip a field.
 */
export async function getPublishedContent(key: string): Promise<Record<string, unknown>> {
  const record = await SiteContentModel.findOne({ key })
    .select({ published: 1, _id: 0 })
    .lean();

  if (!record?.published) throw new NotFoundError('That page');

  const published = record.published as unknown as Record<string, unknown>;

  return { ...published, data: withoutOperationalRefs(published.data) };
}

/**
 * The published `data`, minus the ids that only mean anything inside the portal.
 *
 * `portraitAssetId` points into `assets`, an operational collection this API
 * may never serve from and the portfolio may never read. The resolved
 * `portrait` beside it is what the page renders, so the id is of no use out
 * here — and a public payload naming an operational record is exactly what
 * `publishedProjects` is careful not to do (docs/DATA_MODEL.md).
 *
 * It is stripped here rather than at publish so the portal can still tell that
 * the draft names a different image from the one that is live.
 */
function withoutOperationalRefs(data: unknown): Record<string, unknown> {
  if (typeof data !== 'object' || data === null) return {};

  const { portraitAssetId: _id, ...rest } = data as Record<string, unknown>;
  return rest;
}

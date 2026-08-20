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

  return record.published as unknown as Record<string, unknown>;
}

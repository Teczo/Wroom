import { PublishedProjectModel, type PublishedProject } from '../models/PublishedProject.js';
import { NotFoundError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';

/**
 * Everything the public API is allowed to read.
 *
 * This module touches `publishedProjects` and nothing else — that is the rule
 * that keeps a bug in the public API from leaking a client project or a cost.
 * If a change here needs another collection, it is the wrong change.
 */

export async function listPublishedProjects(
  filters: { featured?: boolean },
  pagination: Pagination,
): Promise<{ items: PublishedProject[]; total: number }> {
  const query: Record<string, unknown> = {};
  if (filters.featured !== undefined) query.featured = filters.featured;

  const [items, total] = await Promise.all([
    PublishedProjectModel.find(query)
      .sort({ featured: -1, sortOrder: 1, publishedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    PublishedProjectModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getPublishedProjectBySlug(slug: string): Promise<PublishedProject> {
  const project = await PublishedProjectModel.findOne({ slug }).lean();
  if (!project) throw new NotFoundError('That project');
  return project;
}

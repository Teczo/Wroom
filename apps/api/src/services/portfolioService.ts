import { PublishedProjectModel, type PublishedProject } from '../models/PublishedProject.js';
import { NotFoundError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';
import { signBlobUrlForRead } from './uploadService.js';

/**
 * Everything the public API is allowed to read.
 *
 * This module reads `publishedProjects` and nothing else — that is the rule
 * that keeps a bug in the public API from leaking a client project or a cost.
 * If a change here needs another collection, it is the wrong change.
 *
 * The one thing it does beyond reading is sign the image URLs on the way out.
 * That reads no data: it is local crypto over a URL already in the snapshot.
 */

/**
 * Swaps each stored blob URL for a short-lived signed one.
 *
 * The snapshot stores the permanent path; the account it lives in allows no
 * anonymous access, so the URL only becomes loadable once signed. Signing here
 * rather than at publish time is deliberate — a signature baked into the
 * snapshot would expire and quietly break every image until someone thought to
 * republish.
 */
function withSignedMedia<T extends PublishedProject>(project: T): T {
  // Safe to write into: these are `.lean()` results, read fresh for this
  // request and shared with nothing.
  if (project.heroImage) {
    project.heroImage.url = signBlobUrlForRead(project.heroImage.url);
  }

  for (const item of project.gallery) {
    item.url = signBlobUrlForRead(item.url);
    if (item.thumbnailUrl) item.thumbnailUrl = signBlobUrlForRead(item.thumbnailUrl);
  }

  return project;
}

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

  return { items: items.map(withSignedMedia), total };
}

export async function getPublishedProjectBySlug(slug: string): Promise<PublishedProject> {
  const project = await PublishedProjectModel.findOne({ slug }).lean();
  if (!project) throw new NotFoundError('That project');
  return withSignedMedia(project);
}

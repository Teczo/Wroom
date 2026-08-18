import type { RequestHandler } from 'express';

import { getPublishedProjectBySlug, listPublishedProjects } from '../services/portfolioService.js';
import { parsePagination, queryString, sendData, sendList } from '../utils/http.js';

/**
 * The only controller behind `/public/*`. Every handler here goes through
 * portfolioService, which reads `publishedProjects` and nothing else.
 */

export const list: RequestHandler = async (req, res) => {
  const pagination = parsePagination(req);
  const featuredParam = queryString(req, 'featured');

  const { items, total } = await listPublishedProjects(
    { featured: featuredParam === undefined ? undefined : featuredParam === 'true' },
    pagination,
  );

  sendList(res, items, { total, page: pagination.page, limit: pagination.limit });
};

export const getBySlug: RequestHandler = async (req, res) => {
  sendData(res, await getPublishedProjectBySlug(req.params.slug as string));
};

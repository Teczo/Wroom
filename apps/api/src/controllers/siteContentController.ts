import type { RequestHandler } from 'express';
import type { Types } from 'mongoose';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as siteContentService from '../services/siteContentService.js';
import { getPublishedContent } from '../services/publicContentService.js';
import { sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (_req, res) => {
  const items = await siteContentService.listSiteContent();

  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const get: RequestHandler = async (req, res) => {
  sendData(res, await siteContentService.getSiteContent(req.params.key as string));
};

export const updateDraft: RequestHandler = async (req, res) => {
  sendData(
    res,
    await siteContentService.updateDraft(
      req.params.key as string,
      validated(req),
      currentUser(req)._id as Types.ObjectId,
    ),
  );
};

export const publish: RequestHandler = async (req, res) => {
  sendData(
    res,
    await siteContentService.publishSiteContent(
      req.params.key as string,
      currentUser(req)._id as Types.ObjectId,
    ),
  );
};

export const unpublish: RequestHandler = async (req, res) => {
  sendData(res, await siteContentService.unpublishSiteContent(req.params.key as string));
};

/**
 * The `/public` counterpart. It goes through publicContentService, which reads
 * the `published` sub-document and never loads `draft`.
 */
export const getPublic: RequestHandler = async (req, res) => {
  sendData(res, await getPublishedContent(req.params.key as string));
};

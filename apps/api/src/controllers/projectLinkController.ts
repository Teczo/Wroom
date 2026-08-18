import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as linkService from '../services/projectLinkService.js';
import { sendData } from '../utils/http.js';

/** Outgoing and incoming are separate lists, so this is one object, not a list. */
export const list: RequestHandler = async (req, res) => {
  sendData(res, await linkService.listLinks(req.params.projectId as string));
};

export const create: RequestHandler = async (req, res) => {
  const link = await linkService.createLink(req.params.projectId as string, validated(req));
  sendData(res, link, 201);
};

export const update: RequestHandler = async (req, res) => {
  sendData(res, await linkService.updateLink(req.params.id as string, validated(req)));
};

export const remove: RequestHandler = async (req, res) => {
  await linkService.deleteLink(req.params.id as string);
  res.status(204).end();
};

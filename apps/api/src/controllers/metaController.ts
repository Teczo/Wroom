import type { RequestHandler } from 'express';

import { currentUser } from '../middleware/auth.js';
import { getProjectTypeByKey, listProjectTypes } from '../services/projectTypeService.js';
import { sendData, sendList } from '../utils/http.js';

/** The signed-in user — the portal's first call after Auth0 returns a token. */
export const me: RequestHandler = async (req, res) => {
  sendData(res, currentUser(req));
};

export const listTypes: RequestHandler = async (req, res) => {
  const items = await listProjectTypes(req.query.includeInactive === 'true');
  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const getType: RequestHandler = async (req, res) => {
  sendData(res, await getProjectTypeByKey(req.params.key as string));
};

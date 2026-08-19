import type { RequestHandler } from 'express';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import {
  createProjectType,
  deleteProjectType,
  getProjectTypeByKey,
  listProjectTypes,
  updateProjectType,
} from '../services/projectTypeService.js';
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

export const createType: RequestHandler = async (req, res) => {
  const { projectType } = await createProjectType(validated(req));
  sendData(res, projectType, 201);
};

/**
 * Answers with any field keys the edit removed, so the portal can say that the
 * values behind them are hidden rather than gone.
 */
export const updateType: RequestHandler = async (req, res) => {
  const { projectType, removedFieldKeys } = await updateProjectType(
    req.params.id as string,
    validated(req),
  );

  sendData(res, projectType, 200, { removedFieldKeys });
};

export const removeType: RequestHandler = async (req, res) => {
  await deleteProjectType(req.params.id as string);
  res.status(204).end();
};

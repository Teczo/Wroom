import type { ProjectDocCreateInput } from '@wroom/shared';
import type { RequestHandler } from 'express';
import type { Types } from 'mongoose';

import { validated } from '../middleware/validate.js';
import * as projectDocService from '../services/projectDocService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const items = await projectDocService.listProjectDocs(
    req.params.projectId as string,
    projectDocService.parseKind(queryString(req, 'kind')),
  );

  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const get: RequestHandler = async (req, res) => {
  sendData(
    res,
    await projectDocService.getProjectDoc(
      req.params.projectId as string,
      projectDocService.parseKind(queryString(req, 'kind')),
      req.params.version as string,
    ),
  );
};

/**
 * A machine token is the MCP; a person is the portal. Where a version came
 * from is read off the token, never taken from the body.
 */
export const create: RequestHandler = async (req, res) => {
  const user = req.currentUser;

  const doc = await projectDocService.createProjectDoc(
    req.params.projectId as string,
    validated<ProjectDocCreateInput>(req),
    user
      ? { source: 'portal', userId: user._id as Types.ObjectId }
      : { source: 'mcp', userId: null },
  );

  sendData(res, doc, 201);
};

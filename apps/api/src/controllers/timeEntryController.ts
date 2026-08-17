import type { RequestHandler } from 'express';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as timeEntryService from '../services/timeEntryService.js';
import { parsePagination, queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const pagination = parsePagination(req);
  const { items, total } = await timeEntryService.listTimeEntries(
    req.params.projectId as string,
    { featureId: queryString(req, 'featureId') },
    pagination,
  );

  sendList(res, items, { total, page: pagination.page, limit: pagination.limit });
};

export const create: RequestHandler = async (req, res) => {
  const entry = await timeEntryService.createTimeEntry(
    req.params.projectId as string,
    validated(req),
    currentUser(req),
  );
  sendData(res, entry, 201);
};

export const update: RequestHandler = async (req, res) => {
  const entry = await timeEntryService.updateTimeEntry(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, entry);
};

export const remove: RequestHandler = async (req, res) => {
  await timeEntryService.deleteTimeEntry(req.params.projectId as string, req.params.id as string);
  res.status(204).end();
};

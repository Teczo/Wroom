import type { RequestHandler } from 'express';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as timeEntryService from '../services/timeEntryService.js';
import { summariseFeatureTime, summariseProjectTime } from '../services/timeSummaryService.js';
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

function timeWindow(req: Parameters<RequestHandler>[0]): { from?: Date; to?: Date } {
  const parse = (value: string | undefined) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  return { from: parse(queryString(req, 'from')), to: parse(queryString(req, 'to')) };
}

/** Hours and time cost for a project, broken down by activity and by feature. */
export const projectTimeSummary: RequestHandler = async (req, res) => {
  sendData(
    res,
    await summariseProjectTime(req.params.projectId as string, timeWindow(req)),
  );
};

/** The same for one feature. */
export const featureTimeSummary: RequestHandler = async (req, res) => {
  sendData(res, await summariseFeatureTime(req.params.id as string, timeWindow(req)));
};

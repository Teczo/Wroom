import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as costService from '../services/costService.js';
import { parsePagination, queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const pagination = parsePagination(req);
  const { items, total } = await costService.listCosts(
    req.params.projectId as string,
    { vendor: queryString(req, 'vendor'), billingCycle: queryString(req, 'billingCycle') },
    pagination,
  );

  sendList(res, items, { total, page: pagination.page, limit: pagination.limit });
};

export const create: RequestHandler = async (req, res) => {
  const cost = await costService.createCost(req.params.projectId as string, validated(req));
  sendData(res, cost, 201);
};

export const update: RequestHandler = async (req, res) => {
  const cost = await costService.updateCost(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, cost);
};

export const remove: RequestHandler = async (req, res) => {
  await costService.deleteCost(req.params.projectId as string, req.params.id as string);
  res.status(204).end();
};

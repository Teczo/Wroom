import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as revenueService from '../services/revenueService.js';
import { sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const items = await revenueService.listRevenue(req.params.projectId as string);
  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const create: RequestHandler = async (req, res) => {
  const entry = await revenueService.createRevenue(
    req.params.projectId as string,
    validated(req),
  );
  sendData(res, entry, 201);
};

export const update: RequestHandler = async (req, res) => {
  sendData(res, await revenueService.updateRevenue(req.params.id as string, validated(req)));
};

/** One action: paid, and when. */
export const markPaid: RequestHandler = async (req, res) => {
  const { paidAt } = validated<{ paidAt: Date | null }>(req);
  sendData(res, await revenueService.markRevenuePaid(req.params.id as string, paidAt));
};

export const remove: RequestHandler = async (req, res) => {
  await revenueService.deleteRevenue(req.params.id as string);
  res.status(204).end();
};

/** Paid and outstanding, portfolio-wide, never added together. */
export const summary: RequestHandler = async (_req, res) => {
  sendData(res, await revenueService.summariseRevenue());
};

import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as featureService from '../services/featureService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const items = await featureService.listFeatures(req.params.projectId as string, {
    status: queryString(req, 'status'),
    priority: queryString(req, 'priority'),
    search: queryString(req, 'q'),
  });

  // The board is unpaginated by design, but the envelope stays consistent.
  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const get: RequestHandler = async (req, res) => {
  const feature = await featureService.getFeature(
    req.params.projectId as string,
    req.params.id as string,
  );
  sendData(res, feature);
};

export const create: RequestHandler = async (req, res) => {
  const feature = await featureService.createFeature(
    req.params.projectId as string,
    validated(req),
  );
  sendData(res, feature, 201);
};

export const update: RequestHandler = async (req, res) => {
  const feature = await featureService.updateFeature(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, feature);
};

export const move: RequestHandler = async (req, res) => {
  const feature = await featureService.moveFeature(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, feature);
};

export const remove: RequestHandler = async (req, res) => {
  await featureService.deleteFeature(req.params.projectId as string, req.params.id as string);
  res.status(204).end();
};

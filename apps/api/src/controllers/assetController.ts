import type { RequestHandler } from 'express';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as assetService from '../services/assetService.js';
import { createUploadTicket } from '../services/uploadService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const items = await assetService.listAssets(req.params.projectId as string, {
    kind: queryString(req, 'kind'),
    visibility: queryString(req, 'visibility'),
  });

  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const create: RequestHandler = async (req, res) => {
  const asset = await assetService.createAsset(
    req.params.projectId as string,
    validated(req),
    currentUser(req),
  );
  sendData(res, asset, 201);
};

export const update: RequestHandler = async (req, res) => {
  const asset = await assetService.updateAsset(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, asset);
};

export const remove: RequestHandler = async (req, res) => {
  await assetService.deleteAsset(req.params.projectId as string, req.params.id as string);
  res.status(204).end();
};

/** Why this asset would or would not appear in the portfolio. */
export const publishState: RequestHandler = async (req, res) => {
  const state = await assetService.explainPublishState(
    req.params.projectId as string,
    req.params.id as string,
  );
  sendData(res, state);
};

export const requestUpload: RequestHandler = async (req, res) => {
  sendData(res, await createUploadTicket(validated(req)));
};

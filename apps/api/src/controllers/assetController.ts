import type { RequestHandler } from 'express';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as assetService from '../services/assetService.js';
import { SITE_UPLOAD_OWNER, createUploadTicket } from '../services/uploadService.js';
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

/**
 * The gate result rides along, so marking something public can be answered with
 * "yes, and the project still blocks it" rather than a silent success.
 */
export const update: RequestHandler = async (req, res) => {
  const { asset, publishState: state } = await assetService.updateAsset(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );

  sendData(res, asset, 200, { publishState: state });
};

export const remove: RequestHandler = async (req, res) => {
  await assetService.deleteAsset(req.params.projectId as string, req.params.id as string);
  res.status(204).end();
};

/** Why this asset would or would not appear in the portfolio. */
/** Writes a whole ordering at once, rather than one request per moved card. */
export const reorder: RequestHandler = async (req, res) => {
  const { assetIds } = validated<{ assetIds: string[] }>(req);
  const reordered = await assetService.reorderAssets(req.params.projectId as string, assetIds);

  sendData(res, { reordered });
};

export const publishState: RequestHandler = async (req, res) => {
  const state = await assetService.explainPublishState(
    req.params.projectId as string,
    req.params.id as string,
  );
  sendData(res, state);
};

export const requestUpload: RequestHandler = async (req, res) => {
  const input = validated<{
    projectId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }>(req);

  sendData(res, await createUploadTicket({ ...input, owner: input.projectId }));
};

/** The project-scoped form: the project comes from the route, not the body. */
export const requestProjectUpload: RequestHandler = async (req, res) => {
  const input = validated<{ filename: string; mimeType: string; sizeBytes: number }>(req);

  sendData(
    res,
    await createUploadTicket({ ...input, owner: req.params.projectId as string }),
  );
};

/**
 * The site's own assets: the portrait the landing and about pages show.
 *
 * The same service, with no project. `null` is the owner rather than a magic
 * string, so a request here can never reach a project's file and a project's
 * request can never reach one of these (CLAUDE.md §8).
 */
export const listSite: RequestHandler = async (_req, res) => {
  const items = await assetService.listAssets(null, {});
  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const createSite: RequestHandler = async (req, res) => {
  const asset = await assetService.createAsset(null, validated(req), currentUser(req));
  sendData(res, asset, 201);
};

export const updateSite: RequestHandler = async (req, res) => {
  const { asset, publishState: state } = await assetService.updateAsset(
    null,
    req.params.id as string,
    validated(req),
  );

  sendData(res, asset, 200, { publishState: state });
};

export const removeSite: RequestHandler = async (req, res) => {
  await assetService.deleteAsset(null, req.params.id as string);
  res.status(204).end();
};

export const requestSiteUpload: RequestHandler = async (req, res) => {
  const input = validated<{ filename: string; mimeType: string; sizeBytes: number }>(req);
  sendData(res, await createUploadTicket({ ...input, owner: SITE_UPLOAD_OWNER }));
};

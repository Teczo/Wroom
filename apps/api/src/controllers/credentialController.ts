import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as credentialService from '../services/credentialService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

function positiveInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export const list: RequestHandler = async (req, res) => {
  const items = await credentialService.listCredentials({
    projectId: queryString(req, 'projectId'),
    expiringWithinDays: positiveInt(queryString(req, 'expiringWithinDays')),
  });

  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

/** The same list, scoped to one project, for the project page's section. */
export const listForProject: RequestHandler = async (req, res) => {
  const items = await credentialService.listCredentials({
    projectId: req.params.projectId as string,
  });

  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const get: RequestHandler = async (req, res) => {
  sendData(res, await credentialService.getCredential(req.params.id as string));
};

export const create: RequestHandler = async (req, res) => {
  sendData(res, await credentialService.createCredential(validated(req)), 201);
};

export const update: RequestHandler = async (req, res) => {
  sendData(res, await credentialService.updateCredential(req.params.id as string, validated(req)));
};

export const remove: RequestHandler = async (req, res) => {
  await credentialService.deleteCredential(req.params.id as string);
  res.status(204).end();
};

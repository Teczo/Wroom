import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as accountService from '../services/accountService.js';
import * as infrastructureService from '../services/infrastructureService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

// --- accounts ---------------------------------------------------------------

export const listAccounts: RequestHandler = async (req, res) => {
  const items = await accountService.listAccounts({ vendor: queryString(req, 'vendor') });
  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const getAccount: RequestHandler = async (req, res) => {
  sendData(res, await accountService.getAccount(req.params.id as string));
};

export const createAccount: RequestHandler = async (req, res) => {
  sendData(res, await accountService.createAccount(validated(req)), 201);
};

export const updateAccount: RequestHandler = async (req, res) => {
  sendData(res, await accountService.updateAccount(req.params.id as string, validated(req)));
};

export const removeAccount: RequestHandler = async (req, res) => {
  await accountService.deleteAccount(req.params.id as string);
  res.status(204).end();
};

// --- environments -----------------------------------------------------------

export const listEnvironments: RequestHandler = async (req, res) => {
  const items = await infrastructureService.listEnvironments(req.params.projectId as string);
  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const createEnvironment: RequestHandler = async (req, res) => {
  const environment = await infrastructureService.createEnvironment(
    req.params.projectId as string,
    validated(req),
  );
  sendData(res, environment, 201);
};

export const updateEnvironment: RequestHandler = async (req, res) => {
  const environment = await infrastructureService.updateEnvironment(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, environment);
};

export const removeEnvironment: RequestHandler = async (req, res) => {
  await infrastructureService.deleteEnvironment(
    req.params.projectId as string,
    req.params.id as string,
  );
  res.status(204).end();
};

// --- services ---------------------------------------------------------------

export const listServices: RequestHandler = async (req, res) => {
  const items = await infrastructureService.listServices(req.params.projectId as string, {
    environmentId: queryString(req, 'environmentId'),
    role: queryString(req, 'role'),
  });
  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const createService: RequestHandler = async (req, res) => {
  const service = await infrastructureService.createService(
    req.params.projectId as string,
    validated(req),
  );
  sendData(res, service, 201);
};

export const updateService: RequestHandler = async (req, res) => {
  const service = await infrastructureService.updateService(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, service);
};

export const removeService: RequestHandler = async (req, res) => {
  await infrastructureService.deleteService(
    req.params.projectId as string,
    req.params.id as string,
  );
  res.status(204).end();
};

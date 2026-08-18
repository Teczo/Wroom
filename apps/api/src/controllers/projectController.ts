import type { RequestHandler } from 'express';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as projectService from '../services/projectService.js';
import * as publishService from '../services/publishService.js';
import { parsePagination, queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const pagination = parsePagination(req);
  const { items, total } = await projectService.listProjects(
    {
      productId: queryString(req, 'productId'),
      status: queryString(req, 'status'),
      projectTypeKey: queryString(req, 'projectTypeKey'),
      search: queryString(req, 'q'),
    },
    pagination,
  );

  sendList(res, items, { total, page: pagination.page, limit: pagination.limit });
};

export const get: RequestHandler = async (req, res) => {
  sendData(res, await projectService.getProject(req.params.id as string));
};

export const create: RequestHandler = async (req, res) => {
  const project = await projectService.createProject(validated(req));
  sendData(res, project, 201);
};

export const update: RequestHandler = async (req, res) => {
  const project = await projectService.updateProject(req.params.id as string, validated(req));
  sendData(res, project);
};

export const remove: RequestHandler = async (req, res) => {
  await projectService.deleteProject(req.params.id as string);
  res.status(204).end();
};

export const publish: RequestHandler = async (req, res) => {
  const published = await publishService.publishProject(
    req.params.id as string,
    currentUser(req),
  );
  sendData(res, published);
};

export const unpublish: RequestHandler = async (req, res) => {
  await publishService.unpublishProject(req.params.id as string);
  res.status(204).end();
};

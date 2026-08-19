import type { RequestHandler } from 'express';

import { currentUser } from '../middleware/auth.js';
import type { ProjectListQuery } from '@wroom/shared';

import { validated, validatedQuery } from '../middleware/validate.js';
import * as projectService from '../services/projectService.js';
import { updateProjectPortfolio } from '../services/portfolioEditService.js';
import * as publishService from '../services/publishService.js';
import { sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const query = validatedQuery<ProjectListQuery>(req);
  const { page, limit } = query;

  const { items, total } = await projectService.listProjects(
    {
      productId: query.productId,
      status: query.status,
      projectTypeKey: query.projectTypeKey,
      tag: query.tag,
      search: query.q,
      includeArchived: query.includeArchived,
    },
    { page, limit, skip: (page - 1) * limit },
  );

  sendList(res, items, { total, page, limit });
};

/** Powers the tag filter — the tags that exist, not a managed vocabulary. */
export const listTags: RequestHandler = async (_req, res) => {
  const tags = await projectService.listProjectTags();
  sendList(res, tags, { total: tags.length, page: 1, limit: tags.length });
};

export const get: RequestHandler = async (req, res) => {
  sendData(res, await projectService.getProjectResponse(req.params.id as string));
};

export const create: RequestHandler = async (req, res) => {
  const project = await projectService.createProject(validated(req));
  sendData(res, project, 201);
};

export const update: RequestHandler = async (req, res) => {
  const { project, droppedDetailKeys } = await projectService.updateProject(
    req.params.id as string,
    validated(req),
  );
  sendData(res, project, 200, { droppedDetailKeys });
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

/**
 * Edits the case study. Saves the source data and answers with the gate
 * verdict — it never publishes.
 */
export const updatePortfolio: RequestHandler = async (req, res) => {
  const { project, publishState, blockingProductName } = await updateProjectPortfolio(
    req.params.id as string,
    validated(req),
  );

  sendData(res, project, 200, { publishState, blockingProductName });
};

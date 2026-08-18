import { projectLinkCreateSchema, projectLinkUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/projectLinkController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/links — read and create from one end. */
export const projectLinksRouter: Router = Router({ mergeParams: true });

projectLinksRouter.get('/', controller.list);
projectLinksRouter.post('/', validateBody(projectLinkCreateSchema), controller.create);

/**
 * Mounted at /api/project-links — a link belongs to two projects, so editing
 * one by id is not nested under either of them.
 */
export const projectLinkAdminRouter: Router = Router();

projectLinkAdminRouter.patch(
  '/:id',
  validateBody(projectLinkUpdateSchema),
  controller.update,
);
projectLinkAdminRouter.delete('/:id', controller.remove);

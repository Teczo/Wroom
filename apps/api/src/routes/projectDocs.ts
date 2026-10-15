import { projectDocCreateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/projectDocController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/docs. Append-only — no PATCH, no DELETE. */
export const projectDocsRouter: Router = Router({ mergeParams: true });

projectDocsRouter.get('/', controller.list);
projectDocsRouter.post('/', validateBody(projectDocCreateSchema), controller.create);
projectDocsRouter.get('/:version', controller.get);

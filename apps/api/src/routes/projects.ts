import { projectCreateSchema, projectListQuerySchema, projectUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/projectController.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { assetsRouter } from './assets.js';
import { costsRouter } from './costs.js';
import { projectCredentialsRouter } from './credentials.js';
import { projectDecisionsRouter } from './decisions.js';
import { environmentsRouter, servicesRouter } from './infrastructure.js';
import { featuresRouter } from './features.js';
import { projectNotesRouter } from './notes.js';
import { projectLinksRouter } from './projectLinks.js';
import { timeEntriesRouter } from './timeEntries.js';

export const projectsRouter: Router = Router();

projectsRouter.get('/', validateQuery(projectListQuerySchema), controller.list);
projectsRouter.post('/', validateBody(projectCreateSchema), controller.create);

/** Ahead of `/:id`, or "tags" would be read as a project id. */
projectsRouter.get('/tags', controller.listTags);

projectsRouter.get('/:id', controller.get);
projectsRouter.patch('/:id', validateBody(projectUpdateSchema), controller.update);
projectsRouter.delete('/:id', controller.remove);

/**
 * Publishing is its own explicit action — it is never a side effect of saving
 * the project (CLAUDE.md §8).
 */
projectsRouter.post('/:id/publish', controller.publish);
projectsRouter.delete('/:id/publish', controller.unpublish);

projectsRouter.use('/:projectId/features', featuresRouter);
projectsRouter.use('/:projectId/costs', costsRouter);
projectsRouter.use('/:projectId/time-entries', timeEntriesRouter);
projectsRouter.use('/:projectId/assets', assetsRouter);
projectsRouter.use('/:projectId/credentials', projectCredentialsRouter);
projectsRouter.use('/:projectId/links', projectLinksRouter);
projectsRouter.use('/:projectId/notes', projectNotesRouter);
projectsRouter.use('/:projectId/decisions', projectDecisionsRouter);
projectsRouter.use('/:projectId/environments', environmentsRouter);
projectsRouter.use('/:projectId/services', servicesRouter);

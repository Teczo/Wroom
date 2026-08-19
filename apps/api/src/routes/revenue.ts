import {
  revenueCreateSchema,
  revenueMarkPaidSchema,
  revenueUpdateSchema,
} from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/revenueController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/revenue. */
export const projectRevenueRouter: Router = Router({ mergeParams: true });

projectRevenueRouter.get('/', controller.list);
projectRevenueRouter.post('/', validateBody(revenueCreateSchema), controller.create);

/**
 * Mounted at /api/revenue. Nothing here is reachable from `/public` — revenue
 * never appears in the portfolio (CLAUDE.md §6).
 */
export const revenueRouter: Router = Router();

/** Ahead of `/:id`, or "summary" is read as an id. */
revenueRouter.get('/summary', controller.summary);

revenueRouter.patch('/:id', validateBody(revenueUpdateSchema), controller.update);
revenueRouter.post('/:id/paid', validateBody(revenueMarkPaidSchema), controller.markPaid);
revenueRouter.delete('/:id', controller.remove);

import { costCreateSchema, costUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/costController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/costs. */
export const costsRouter: Router = Router({ mergeParams: true });

costsRouter.get('/', controller.list);
costsRouter.post('/', validateBody(costCreateSchema), controller.create);
costsRouter.patch('/:id', validateBody(costUpdateSchema), controller.update);
costsRouter.delete('/:id', controller.remove);

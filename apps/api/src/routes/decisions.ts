import {
  decisionCreateSchema,
  decisionSupersedeSchema,
  decisionUpdateSchema,
} from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/decisionController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/decisions. */
export const projectDecisionsRouter: Router = Router({ mergeParams: true });

projectDecisionsRouter.get('/', controller.list);
projectDecisionsRouter.post('/', validateBody(decisionCreateSchema), controller.create);

/** Mounted at /api/decisions. */
export const decisionsRouter: Router = Router();

decisionsRouter.get('/:id', controller.get);
decisionsRouter.patch('/:id', validateBody(decisionUpdateSchema), controller.update);
decisionsRouter.post(
  '/:id/supersede',
  validateBody(decisionSupersedeSchema),
  controller.supersede,
);
decisionsRouter.delete('/:id', controller.remove);

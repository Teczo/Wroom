import { assetCreateSchema, assetUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/assetController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/assets. */
export const assetsRouter: Router = Router({ mergeParams: true });

assetsRouter.get('/', controller.list);
assetsRouter.post('/', validateBody(assetCreateSchema), controller.create);
assetsRouter.patch('/:id', validateBody(assetUpdateSchema), controller.update);
assetsRouter.get('/:id/publish-state', controller.publishState);
assetsRouter.delete('/:id', controller.remove);

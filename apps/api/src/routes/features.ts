import { featureCreateSchema, featureMoveSchema, featureUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/featureController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/features. */
export const featuresRouter: Router = Router({ mergeParams: true });

featuresRouter.get('/', controller.list);
featuresRouter.post('/', validateBody(featureCreateSchema), controller.create);
featuresRouter.get('/:id', controller.get);
featuresRouter.patch('/:id', validateBody(featureUpdateSchema), controller.update);
/** The Kanban drag — status and position in one call. */
featuresRouter.patch('/:id/move', validateBody(featureMoveSchema), controller.move);
featuresRouter.delete('/:id', controller.remove);

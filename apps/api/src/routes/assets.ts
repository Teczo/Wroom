import {
  assetCreateSchema,
  assetUpdateSchema,
  projectUploadRequestSchema,
} from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/assetController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/assets. */
export const assetsRouter: Router = Router({ mergeParams: true });

assetsRouter.get('/', controller.list);

/**
 * Ahead of `/:id`. Checks the mime type and size before signing anything, so a
 * file that would be refused never gets a URL to upload to.
 */
assetsRouter.post(
  '/upload-url',
  validateBody(projectUploadRequestSchema),
  controller.requestProjectUpload,
);

assetsRouter.post('/', validateBody(assetCreateSchema), controller.create);
assetsRouter.patch('/:id', validateBody(assetUpdateSchema), controller.update);
assetsRouter.get('/:id/publish-state', controller.publishState);
assetsRouter.delete('/:id', controller.remove);

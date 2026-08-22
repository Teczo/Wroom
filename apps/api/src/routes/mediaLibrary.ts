import { mediaLibraryCreateSchema, mediaLibraryUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/mediaLibraryController.js';
import { validateBody } from '../middleware/validate.js';

/**
 * Mounted at /api/media-library.
 *
 * Note the absence of `refuseSecretFields` here, which most write routes carry:
 * that guard treats a top-level `key` as a secret-shaped property, and `key` is
 * this collection's identifier. Nothing on a mark is a credential, so there is
 * nothing for it to protect.
 */
export const mediaLibraryRouter: Router = Router();

mediaLibraryRouter.get('/', controller.list);
mediaLibraryRouter.post('/', validateBody(mediaLibraryCreateSchema), controller.create);
mediaLibraryRouter.patch('/:id', validateBody(mediaLibraryUpdateSchema), controller.update);
mediaLibraryRouter.delete('/:id', controller.remove);

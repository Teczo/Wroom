import { credentialCreateSchema, credentialUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/credentialController.js';
import { refuseSecretFields } from '../middleware/refuseSecrets.js';
import { validateBody } from '../middleware/validate.js';

/**
 * Mounted at /api/credentials. Every write passes `refuseSecretFields` first,
 * so a body carrying a key or token is turned away with a plain explanation
 * before anything looks at the rest of it.
 */
export const credentialsRouter: Router = Router();

credentialsRouter.get('/', controller.list);
credentialsRouter.post(
  '/',
  refuseSecretFields,
  validateBody(credentialCreateSchema),
  controller.create,
);
credentialsRouter.get('/:id', controller.get);
credentialsRouter.patch(
  '/:id',
  refuseSecretFields,
  validateBody(credentialUpdateSchema),
  controller.update,
);
credentialsRouter.delete('/:id', controller.remove);

/** Mounted under /api/projects/:projectId/credentials — read only. */
export const projectCredentialsRouter: Router = Router({ mergeParams: true });

projectCredentialsRouter.get('/', controller.listForProject);

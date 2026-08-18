import {
  accountCreateSchema,
  accountUpdateSchema,
  environmentCreateSchema,
  environmentUpdateSchema,
  serviceCreateSchema,
  serviceUpdateSchema,
} from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/infrastructureController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted at /api/accounts — accounts are owned by you, not by a project. */
export const accountsRouter: Router = Router();

accountsRouter.get('/', controller.listAccounts);
accountsRouter.post('/', validateBody(accountCreateSchema), controller.createAccount);
accountsRouter.get('/:id', controller.getAccount);
accountsRouter.patch('/:id', validateBody(accountUpdateSchema), controller.updateAccount);
accountsRouter.delete('/:id', controller.removeAccount);

/** Mounted under /api/projects/:projectId/environments. */
export const environmentsRouter: Router = Router({ mergeParams: true });

environmentsRouter.get('/', controller.listEnvironments);
environmentsRouter.post('/', validateBody(environmentCreateSchema), controller.createEnvironment);
environmentsRouter.patch(
  '/:id',
  validateBody(environmentUpdateSchema),
  controller.updateEnvironment,
);
environmentsRouter.delete('/:id', controller.removeEnvironment);

/** Mounted under /api/projects/:projectId/services. */
export const servicesRouter: Router = Router({ mergeParams: true });

servicesRouter.get('/', controller.listServices);
servicesRouter.post('/', validateBody(serviceCreateSchema), controller.createService);
servicesRouter.patch('/:id', validateBody(serviceUpdateSchema), controller.updateService);
servicesRouter.delete('/:id', controller.removeService);

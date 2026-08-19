import { stripeSyncQuerySchema, vendorConnectionSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/integrationController.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

/**
 * Mounted at /api/integrations. Nothing here is reachable from `/public` —
 * vendor connections are operational data and never reach the portfolio
 * (CLAUDE.md §6).
 *
 * `refuseSecretFields` is deliberately not applied. It matches on property
 * names, and `secretRef` is legitimately named after the thing it points at;
 * the guard here is on the value instead, in `secretPointer()`.
 */
export const integrationsRouter: Router = Router();

integrationsRouter.get('/stripe', controller.getStripe);
integrationsRouter.put('/stripe', validateBody(vendorConnectionSchema), controller.saveStripe);

/** A pull, on demand. No webhook and no schedule (ticket, out of scope). */
integrationsRouter.post(
  '/stripe/sync',
  validateQuery(stripeSyncQuerySchema),
  controller.syncStripe,
);

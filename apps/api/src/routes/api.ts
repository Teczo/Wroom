import { uploadRequestSchema } from '@wroom/shared';
import { Router } from 'express';

import { requestUpload } from '../controllers/assetController.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as featureController from '../controllers/featureController.js';
import * as meta from '../controllers/metaController.js';
import { loadCurrentUser, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { credentialsRouter } from './credentials.js';
import { decisionsRouter } from './decisions.js';
import { accountsRouter } from './infrastructure.js';
import { revenueRouter } from './revenue.js';
import { notesRouter } from './notes.js';
import { projectLinkAdminRouter } from './projectLinks.js';
import { productsRouter } from './products.js';
import { projectsRouter } from './projects.js';

/**
 * The authenticated namespace. Auth is applied to the router itself rather than
 * route by route — CLAUDE.md §6 makes this split a security boundary, and a
 * per-route guard is one that can be forgotten on the next route added.
 */
export const apiRouter: Router = Router();

apiRouter.use(requireAuth, loadCurrentUser);

apiRouter.get('/me', meta.me);

/** Not under a project — the template is the same blank file for all of them. */
apiRouter.get('/features/csv-template', featureController.csvTemplate);
apiRouter.get('/dashboard', dashboard.summary);
apiRouter.get('/project-types', meta.listTypes);
apiRouter.get('/project-types/:key', meta.getType);

apiRouter.use('/products', productsRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/accounts', accountsRouter);
apiRouter.use('/revenue', revenueRouter);
apiRouter.use('/credentials', credentialsRouter);
apiRouter.use('/project-links', projectLinkAdminRouter);
apiRouter.use('/notes', notesRouter);
apiRouter.use('/decisions', decisionsRouter);

/** Hands back a short-lived SAS URL; the storage key never leaves the server. */
apiRouter.post('/uploads/sas', validateBody(uploadRequestSchema), requestUpload);

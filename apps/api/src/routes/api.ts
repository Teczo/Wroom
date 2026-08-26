import {
  bootstrapImportSchema,
  projectTypeCreateSchema,
  projectTypeUpdateSchema,
  uploadRequestSchema,
} from '@wroom/shared';
import { Router } from 'express';

import { requestUpload } from '../controllers/assetController.js';
import * as bootstrapImport from '../controllers/bootstrapImportController.js';
import * as costController from '../controllers/costController.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as featureController from '../controllers/featureController.js';
import * as timeController from '../controllers/timeEntryController.js';
import * as meta from '../controllers/metaController.js';
import { loadCurrentUser, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { contentRouter } from './content.js';
import { credentialsRouter } from './credentials.js';
import { decisionsRouter } from './decisions.js';
import { enquiriesRouter } from './enquiriesAdmin.js';
import { accountsRouter } from './infrastructure.js';
import { integrationsRouter } from './integrations.js';
import { mediaLibraryRouter } from './mediaLibrary.js';
import { siteAssetsRouter } from './siteAssets.js';
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

/**
 * Bootstrap import — a product, a project and its features in one body. Flat,
 * because it is not scoped to a project: creating one is the point of it.
 */
apiRouter.post(
  '/import/bootstrap/preview',
  validateBody(bootstrapImportSchema),
  bootstrapImport.preview,
);
apiRouter.post(
  '/import/bootstrap/commit',
  validateBody(bootstrapImportSchema),
  bootstrapImport.commit,
);

apiRouter.get('/features/:id/time-summary', timeController.featureTimeSummary);
apiRouter.get('/dashboard', dashboard.summary);
apiRouter.get('/costs/summary', costController.summary);
apiRouter.get('/project-types', meta.listTypes);
apiRouter.post('/project-types', validateBody(projectTypeCreateSchema), meta.createType);
apiRouter.patch('/project-types/:id', validateBody(projectTypeUpdateSchema), meta.updateType);
apiRouter.delete('/project-types/:id', meta.removeType);
/** Last, so `/project-types/:key` does not swallow the routes above it. */
apiRouter.get('/project-types/:key', meta.getType);

apiRouter.use('/products', productsRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/accounts', accountsRouter);
apiRouter.use('/revenue', revenueRouter);
apiRouter.use('/integrations', integrationsRouter);
apiRouter.use('/credentials', credentialsRouter);
apiRouter.use('/project-links', projectLinkAdminRouter);
apiRouter.use('/notes', notesRouter);
apiRouter.use('/decisions', decisionsRouter);
apiRouter.use('/media-library', mediaLibraryRouter);
apiRouter.use('/content', contentRouter);
apiRouter.use('/site-assets', siteAssetsRouter);
apiRouter.use('/enquiries', enquiriesRouter);

/** Hands back a short-lived SAS URL; the storage key never leaves the server. */
apiRouter.post('/uploads/sas', validateBody(uploadRequestSchema), requestUpload);

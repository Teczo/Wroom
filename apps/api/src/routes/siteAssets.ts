import { assetCreateSchema, assetUpdateSchema, projectUploadRequestSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/assetController.js';
import { validateBody } from '../middleware/validate.js';

/**
 * Mounted at /api/site-assets — the portfolio's own images, which belong to no
 * project.
 *
 * There is only one of these today: the portrait the landing and about pages
 * show. It is the `assets` collection either way, and the same service, so an
 * upload is checked, resized and gated by the code that already does that. What
 * differs is the gate: with no project and no product to read, a site asset is
 * decided by its own visibility alone, in `packages/shared/src/publish.ts`
 * (CLAUDE.md §8).
 *
 * Under `/api`, so the router above applies the Auth0 check. Nothing here is
 * public — the public site sees a portrait only after a content publish copies
 * it into the public container.
 */
export const siteAssetsRouter: Router = Router();

siteAssetsRouter.get('/', controller.listSite);

/** Ahead of `/:id`. Type and size are checked before a URL is signed. */
siteAssetsRouter.post(
  '/upload-url',
  validateBody(projectUploadRequestSchema),
  controller.requestSiteUpload,
);

siteAssetsRouter.post('/', validateBody(assetCreateSchema), controller.createSite);
siteAssetsRouter.patch('/:id', validateBody(assetUpdateSchema), controller.updateSite);
siteAssetsRouter.delete('/:id', controller.removeSite);

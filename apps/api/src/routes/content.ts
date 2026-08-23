import { siteContentPublishSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/siteContentController.js';
import { refusePublishedFields } from '../middleware/refusePublishedFields.js';
import { validateBody } from '../middleware/validate.js';
import { validateSiteContentDraft } from '../middleware/validateSiteContentDraft.js';

/**
 * Mounted at /api/content. Records are keyed by page, and `key` is not
 * creatable here — the seeded records are the whole set, so there is no POST.
 */
export const contentRouter: Router = Router();

contentRouter.get('/', controller.list);
contentRouter.get('/:key', controller.get);

/**
 * Writes the draft. The published half is refused by name, before any write,
 * and `data` is checked against the schema for this particular page — another
 * page's shape is a 400 rather than a record quietly saved as empty.
 */
contentRouter.patch(
  '/:key',
  refusePublishedFields,
  validateSiteContentDraft,
  controller.updateDraft,
);

/**
 * Publishing is its own explicit action — never a side effect of saving
 * (CLAUDE.md §8). Both take no body; anything sent in one is refused rather
 * than ignored, because content nobody reviewed in the editor must not be able
 * to reach the live site through the publish call.
 */
contentRouter.post('/:key/publish', validateBody(siteContentPublishSchema), controller.publish);
contentRouter.post(
  '/:key/unpublish',
  validateBody(siteContentPublishSchema),
  controller.unpublish,
);

import { siteContentDraftUpdateSchema, siteContentPublishSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/siteContentController.js';
import { refusePublishedFields } from '../middleware/refusePublishedFields.js';
import { validateBody } from '../middleware/validate.js';

/**
 * Mounted at /api/content. Records are keyed by page, and `key` is not
 * creatable here — the seeded records are the whole set, so there is no POST.
 */
export const contentRouter: Router = Router();

contentRouter.get('/', controller.list);
contentRouter.get('/:key', controller.get);

/** Writes the draft. The published half is refused by name, before any write. */
contentRouter.patch(
  '/:key',
  refusePublishedFields,
  validateBody(siteContentDraftUpdateSchema),
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

import { enquiryManualCreateSchema, enquiryUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/enquiryAdminController.js';
import { refuseEnquiryContentFields } from '../middleware/refuseEnquiryContentFields.js';
import { validateBody } from '../middleware/validate.js';
import { enquiryNotesRouter } from './notes.js';

/**
 * Mounted at /api/enquiries — reading and working through what came in.
 *
 * Nothing here is public. The intake half lives in routes/enquiries.ts under
 * `/public`, reads no collection, and shares none of this.
 */
export const enquiriesRouter: Router = Router();

enquiriesRouter.get('/', controller.list);
enquiriesRouter.post('/', validateBody(enquiryManualCreateSchema), controller.create);

enquiriesRouter.get('/:id', controller.get);

/**
 * What arrived is not editable — the guard runs before the schema so the
 * refusal names the field rather than reading as a generic validation failure.
 */
enquiriesRouter.patch(
  '/:id',
  refuseEnquiryContentFields,
  validateBody(enquiryUpdateSchema),
  controller.update,
);

enquiriesRouter.delete('/:id', controller.remove);

enquiriesRouter.use('/:enquiryId/notes', enquiryNotesRouter);

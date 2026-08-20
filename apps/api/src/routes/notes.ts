import { enquiryNoteCreateSchema, noteCreateSchema, noteUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/noteController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/notes. */
export const projectNotesRouter: Router = Router({ mergeParams: true });

projectNotesRouter.get('/', controller.list);
projectNotesRouter.post('/', validateBody(noteCreateSchema), controller.create);

/**
 * Mounted under /api/enquiries/:enquiryId/notes.
 *
 * `featureId` is absent from the schema rather than ignored: an enquiry has no
 * features, so a body naming one is a mistake worth reporting.
 */
export const enquiryNotesRouter: Router = Router({ mergeParams: true });

enquiryNotesRouter.get('/', controller.list);
enquiryNotesRouter.post('/', validateBody(enquiryNoteCreateSchema), controller.create);

/** Mounted at /api/notes — editing one by id, whichever owner it has. */
export const notesRouter: Router = Router();

notesRouter.patch('/:id', validateBody(noteUpdateSchema), controller.update);
notesRouter.delete('/:id', controller.remove);

import { timeEntryCreateSchema, timeEntryUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/timeEntryController.js';
import { validateBody } from '../middleware/validate.js';

/** Mounted under /api/projects/:projectId/time-entries. */
export const timeEntriesRouter: Router = Router({ mergeParams: true });

timeEntriesRouter.get('/', controller.list);
timeEntriesRouter.post('/', validateBody(timeEntryCreateSchema), controller.create);
timeEntriesRouter.patch('/:id', validateBody(timeEntryUpdateSchema), controller.update);
timeEntriesRouter.delete('/:id', controller.remove);

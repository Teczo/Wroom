import type { RequestHandler } from 'express';

import { UnprocessableError } from '../utils/errors.js';

/**
 * Refuses a save that tries to write the published half of a content record.
 *
 * Publishing is an explicit action (CLAUDE.md §8), so these three fields have
 * exactly one writer and it is not `PATCH`. The schema would drop them quietly,
 * which is the wrong outcome: a caller who sent `published` and got a 200 back
 * would reasonably believe the live site had changed. This says so instead, and
 * runs before anything is written so nothing was.
 */
const PUBLISH_OWNED = ['published', 'publishedAt', 'publishedByUserId'];

export const refusePublishedFields: RequestHandler = (req, _res, next) => {
  const body = req.body as Record<string, unknown> | undefined;

  if (!body || typeof body !== 'object') {
    next();
    return;
  }

  const offending = PUBLISH_OWNED.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (offending.length > 0) {
    next(
      new UnprocessableError(
        'Saving writes the draft only. Publish the record to change what the live site serves.',
        Object.fromEntries(
          offending.map((field) => [field, 'This is written by publishing, not by saving.']),
        ),
      ),
    );
    return;
  }

  next();
};

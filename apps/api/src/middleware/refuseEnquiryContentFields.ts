import type { RequestHandler } from 'express';

import { UnprocessableError } from '../utils/errors.js';

/**
 * Refuses an edit to what someone actually sent.
 *
 * An enquiry is a record of what arrived. The pipeline around it — status,
 * owner, what they want, what it became — is yours to change; the message, the
 * name, the address, where it came from and the metadata captured with it are
 * not. The schema would drop these quietly, which is the wrong outcome for a
 * record whose value is that it has not been edited.
 */
const NOT_EDITABLE = [
  'name',
  'email',
  'phone',
  'company',
  'message',
  'source',
  'meta',
  'relatedProjectId',
  'createdAt',
  'updatedAt',
];

export const refuseEnquiryContentFields: RequestHandler = (req, _res, next) => {
  const body = req.body as Record<string, unknown> | undefined;

  if (!body || typeof body !== 'object') {
    next();
    return;
  }

  const offending = NOT_EDITABLE.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (offending.length > 0) {
    next(
      new UnprocessableError(
        'An enquiry records what someone sent, so that part of it cannot be edited.',
        Object.fromEntries(
          offending.map((field) => [field, 'This is what arrived, and it stays as it arrived.']),
        ),
      ),
    );
    return;
  }

  next();
};

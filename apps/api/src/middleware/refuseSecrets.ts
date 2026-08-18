import { SECRET_FIELD_MESSAGE, looksLikeSecretField } from '@wroom/shared';
import type { RequestHandler } from 'express';

import { ValidationError } from '../utils/errors.js';

/**
 * Refuses a write that carries a secret-shaped property, before validation.
 *
 * The schema would reject it too, but this runs first so the top-level message
 * says plainly what is wrong rather than the generic "the request body is not
 * valid". Someone posting an API key deserves to be told why it was refused,
 * and to be sure nothing was written.
 */
export const refuseSecretFields: RequestHandler = (req, _res, next) => {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object') {
    next();
    return;
  }

  const offending = Object.keys(body).filter(looksLikeSecretField);

  if (offending.length > 0) {
    next(
      new ValidationError(
        SECRET_FIELD_MESSAGE,
        Object.fromEntries(offending.map((key) => [key, SECRET_FIELD_MESSAGE])),
      ),
    );
    return;
  }

  next();
};

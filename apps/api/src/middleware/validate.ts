import { issuesToDetails, validate, type Validator } from '@wroom/shared';
import type { Request, RequestHandler } from 'express';

import { ValidationError } from '../utils/errors.js';

/**
 * Validates `req.body` against a shared schema and replaces it with the parsed
 * value, so controllers only ever see clean, known fields. Unknown keys are
 * dropped by the schema rather than reaching a Mongoose model.
 */
export function validateBody<T>(schema: Validator<T>): RequestHandler {
  return (req, _res, next) => {
    const result = validate(schema, req.body);
    if (!result.ok) {
      next(new ValidationError('The request body is not valid.', issuesToDetails(result.issues)));
      return;
    }
    (req as Request & { validated?: unknown }).validated = result.value;
    next();
  };
}

/** Reads what `validateBody` parsed. Call only on a route that used it. */
export function validated<T>(req: Request): T {
  return (req as Request & { validated: T }).validated;
}

/**
 * The same treatment for `req.query`. A filter value the API does not recognise
 * is a 400 naming the parameter — never a silently empty list, which looks
 * identical to "nothing matched" and hides the typo that caused it.
 */
export function validateQuery<T>(schema: Validator<T>): RequestHandler {
  return (req, _res, next) => {
    const result = validate(schema, req.query);
    if (!result.ok) {
      next(
        new ValidationError('Those filters are not valid.', issuesToDetails(result.issues)),
      );
      return;
    }
    (req as Request & { validatedQuery?: unknown }).validatedQuery = result.value;
    next();
  };
}

/** Reads what `validateQuery` parsed. Call only on a route that used it. */
export function validatedQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}

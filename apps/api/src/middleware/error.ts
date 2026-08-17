import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

import { AppError, NotFoundError } from '../utils/errors.js';
import { env } from '../config/env.js';

/** 404 for anything no router claimed. */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('That endpoint'));
};

type ErrorBody = {
  error: { code: string; message: string; details?: Record<string, unknown> };
};

function bodyFor(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
    };
  }

  // A malformed ObjectId in a path parameter is a bad request, not a crash.
  if (err instanceof MongooseError.CastError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_FAILED',
          message: `'${err.path}' is not a valid identifier.`,
        },
      },
    };
  }

  if (err instanceof MongooseError.ValidationError) {
    const details: Record<string, string> = {};
    for (const [path, issue] of Object.entries(err.errors)) {
      details[path] = issue.message;
    }
    return {
      status: 400,
      body: {
        error: { code: 'VALIDATION_FAILED', message: 'The request body is not valid.', details },
      },
    };
  }

  if (err instanceof MongoServerError && err.code === 11000) {
    return {
      status: 409,
      body: {
        error: {
          code: 'CONFLICT',
          message: 'A record with that value already exists.',
          details: { keys: Object.keys(err.keyPattern ?? {}) },
        },
      },
    };
  }

  // express-oauth2-jwt-bearer errors carry a status and a safe message.
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status?: unknown }).status === 401
  ) {
    return {
      status: 401,
      body: { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } },
    };
  }

  return {
    status: 500,
    body: { error: { code: 'INTERNAL', message: 'Something went wrong on our end.' } },
  };
}

/**
 * The single place an error becomes a response. Internal messages are never
 * echoed to the client — the real error goes to the server log instead.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, body } = bodyFor(err);

  if (status >= 500) {
    console.error('[api] unhandled error', err);
  } else if (!env.isProduction) {
    console.warn(`[api] ${status} ${body.error.code}: ${body.error.message}`);
  }

  res.status(status).json(body);
};

import type { ErrorCode } from '@wroom/shared';

/**
 * Typed errors thrown by services. The error middleware is the only place that
 * turns one of these into a response — no handler builds an error body itself.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The request body is not valid.', details?: Record<string, unknown>) {
    super(400, 'VALIDATION_FAILED', message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Sign in to continue.') {
    super(401, 'UNAUTHENTICATED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(what = 'That record') {
    super(404, 'NOT_FOUND', `${what} was not found.`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, 'CONFLICT', message, details);
  }
}

/** Well-formed request the server understands but cannot process as asked. */
export class UnprocessableError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(422, 'UNPROCESSABLE', message, details);
  }
}

/**
 * Too much body. Used by the one public write, which caps its payload far
 * tighter than the global parser does.
 */
export class PayloadTooLargeError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(413, 'PAYLOAD_TOO_LARGE', message, details);
  }
}

/**
 * Too many requests. The public enquiry route is the only thing that throws
 * this — it is the one endpoint anyone on the internet can write through.
 */
export class RateLimitedError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(429, 'RATE_LIMITED', message, details);
  }
}

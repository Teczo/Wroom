import {
  ENQUIRY_MIN_SUBMIT_MS,
  ENQUIRY_HONEYPOT_FIELD,
  enquiryBotCheckSchema,
  enquiryCreateSchema,
  isImplausiblyFast,
  issuesToDetails,
  validate,
} from '@wroom/shared';
import type { Request, RequestHandler } from 'express';

import { PayloadTooLargeError, RateLimitedError, UnprocessableError } from '../utils/errors.js';

/**
 * Everything guarding the one unauthenticated write (CLAUDE.md §8).
 *
 * The order matters and is the cheapest-first order: refuse an oversized body
 * before parsing decisions, count the attempt before validating it so a flood
 * of malformed bodies still trips the limit, then the bot checks, then the
 * schema. Nothing in this file reads a collection.
 */

/** 16kB is generous for six short fields and a message, and small enough to be useless to anyone else. */
const MAX_BODY_BYTES = 16 * 1024;

const PER_IP_MAX = 5;
const PER_IP_WINDOW_MS = 10 * 60_000;
const DAILY_TOTAL_MAX = 200;

/**
 * The real client address.
 *
 * Behind Azure App Service `req.ip` is the front end, not the visitor, so a
 * per-IP limit read from it would throttle everyone as one person. The
 * forwarded header is read here rather than by setting `trust proxy` globally,
 * so `req.ip` keeps its current meaning on every other route in the API.
 *
 * The header is attacker-controlled, so this is a best effort: someone willing
 * to forge it can spread themselves across buckets. The daily total below is
 * what catches that, and it cannot be forged around.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(',')[0]?.trim();

  // Azure appends a port to the forwarded address; the address is the part that identifies anyone.
  const withoutPort = first?.replace(/:\d+$/, '');

  return withoutPort || req.ip || 'unknown';
}

export const capBodySize: RequestHandler = (req, _res, next) => {
  const declared = Number(req.headers['content-length'] ?? 0);

  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    next(new PayloadTooLargeError('That message is too long to send.'));
    return;
  }

  next();
};

/**
 * A sliding window per address, plus a total for the day.
 *
 * In memory on purpose: one Azure App Service instance, no new dependency, and
 * nothing to run alongside the API. The trade is that both counters reset when
 * the process restarts, and a second instance would get its own allowance.
 */
type Bucket = number[];

const hits = new Map<string, Bucket>();
let dailyCount = 0;
let dailyStamp = '';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Keeps the map from growing forever on a long-running process. */
function prune(now: number): void {
  for (const [ip, times] of hits) {
    const live = times.filter((time) => now - time < PER_IP_WINDOW_MS);
    if (live.length === 0) hits.delete(ip);
    else hits.set(ip, live);
  }
}

export const rateLimit: RequestHandler = (req, _res, next) => {
  const now = Date.now();
  const stamp = today();

  if (stamp !== dailyStamp) {
    dailyStamp = stamp;
    dailyCount = 0;
  }

  prune(now);

  if (dailyCount >= DAILY_TOTAL_MAX) {
    next(
      new RateLimitedError(
        'This form has taken all it can for today. Please try again tomorrow, or email instead.',
      ),
    );
    return;
  }

  const ip = clientIp(req);
  const times = (hits.get(ip) ?? []).filter((time) => now - time < PER_IP_WINDOW_MS);

  if (times.length >= PER_IP_MAX) {
    next(
      new RateLimitedError(
        'That is a few messages in a short time. Give it a few minutes and try again.',
      ),
    );
    return;
  }

  // Counted on the attempt, not on success, so a flood of invalid bodies is
  // still a flood.
  times.push(now);
  hits.set(ip, times);
  dailyCount += 1;

  next();
};

/** Test seam: the counters live in module state, so a run has to be able to clear them. */
export function resetRateLimitState(): void {
  hits.clear();
  dailyCount = 0;
  dailyStamp = '';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      submittedInMs?: number | null;
    }
  }
}

/**
 * The two checks a person passes without noticing.
 *
 * Both refuse in the same way an ordinary validation failure does, without
 * saying which check failed — a bot author reading the response should not be
 * told which of the two to fix.
 */
export const botChecks: RequestHandler = (req, _res, next) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const result = validate(enquiryBotCheckSchema, {
    honeypot: body[ENQUIRY_HONEYPOT_FIELD],
    submittedInMs: body.submittedInMs,
  });

  const refuse = () => {
    next(new UnprocessableError('That message could not be sent. Please try again.'));
  };

  if (!result.ok) {
    refuse();
    return;
  }

  // A field no person can see, so anything in it was put there by a script.
  if ((result.value.honeypot ?? '') !== '') {
    refuse();
    return;
  }

  if (isImplausiblyFast(result.value.submittedInMs)) {
    refuse();
    return;
  }

  req.submittedInMs = result.value.submittedInMs ?? null;
  next();
};

/**
 * The schema, with failures reported as 422 rather than the 400 the rest of the
 * API uses. That is what this ticket asks for: a well-formed request the server
 * understands and refuses to process, rather than a malformed one.
 */
export const validateEnquiryBody: RequestHandler = (req, _res, next) => {
  const result = validate(enquiryCreateSchema, req.body);

  if (!result.ok) {
    next(
      new UnprocessableError(
        'Some of that could not be accepted.',
        issuesToDetails(result.issues),
      ),
    );
    return;
  }

  (req as Request & { validated?: unknown }).validated = result.value;
  next();
};

export const ENQUIRY_INTAKE_LIMITS = {
  maxBodyBytes: MAX_BODY_BYTES,
  perIpMax: PER_IP_MAX,
  perIpWindowMs: PER_IP_WINDOW_MS,
  dailyTotalMax: DAILY_TOTAL_MAX,
  minSubmitMs: ENQUIRY_MIN_SUBMIT_MS,
} as const;

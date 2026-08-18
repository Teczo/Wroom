import { auth } from 'express-oauth2-jwt-bearer';
import type { RequestHandler } from 'express';

import { env } from '../config/env.js';
import { UnauthenticatedError } from '../utils/errors.js';
import { UserModel, type UserDocument } from '../models/User.js';

/**
 * Auth0 JWT verification. Mounted on the whole `/api` namespace — CLAUDE.md §6
 * makes that split a security boundary, so this is applied to the router, never
 * route by route where one could be forgotten.
 */
export const requireAuth: RequestHandler = auth({
  issuerBaseURL: `https://${env.auth0.domain}/`,
  audience: env.auth0.audience,
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: UserDocument;
    }
  }
}

/**
 * Resolves the Auth0 subject to a `users` record, creating one on first sign-in.
 *
 * The first person to sign in becomes the owner — that is the bootstrap for a
 * fresh database. Everyone after that starts as a viewer and is promoted by hand.
 */
export const loadCurrentUser: RequestHandler = async (req, _res, next) => {
  const payload = req.auth?.payload;
  const authProviderId = payload?.sub;

  if (!authProviderId) {
    next(new UnauthenticatedError());
    return;
  }

  const existing = await UserModel.findOne({ authProviderId });
  if (existing) {
    req.currentUser = existing;
    next();
    return;
  }

  const isFirstUser = (await UserModel.estimatedDocumentCount()) === 0;
  const claims = payload as Record<string, unknown>;

  req.currentUser = await UserModel.create({
    authProviderId,
    name: typeof claims.name === 'string' ? claims.name : 'New user',
    email: typeof claims.email === 'string' ? claims.email : '',
    avatarUrl: typeof claims.picture === 'string' ? claims.picture : null,
    globalRole: isFirstUser ? 'owner' : 'viewer',
  });

  next();
};

/** Throws rather than returning undefined, so controllers can rely on it. */
export function currentUser(req: Express.Request): UserDocument {
  if (!req.currentUser) throw new UnauthenticatedError();
  return req.currentUser;
}

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
 * A machine subject — a service calling the API rather than a person.
 *
 * Auth0 stamps `<client-id>@clients` on a client-credentials token. The MCP
 * server holds one of these, and the Claude Code integration will later.
 */
function isMachineSubject(subject: string): boolean {
  return subject.endsWith('@clients');
}

/**
 * Resolves the Auth0 subject to a `users` record, creating one on first sign-in.
 *
 * The first person to sign in becomes the owner — that is the bootstrap for a
 * fresh database. Everyone after that starts as a viewer and is promoted by hand.
 *
 * A machine caller is let through without any of that. It is not a person, so
 * it gets no `users` row: one would show up in the team list as a member nobody
 * hired, and against an empty database the bootstrap rule above would hand a
 * service the owner role. `req.currentUser` stays undefined for machines, and
 * `currentUser()` below throws if a route actually needs a person — which is
 * the right answer, because a machine cannot author a note or a decision.
 */
export const loadCurrentUser: RequestHandler = async (req, _res, next) => {
  const payload = req.auth?.payload;
  const authProviderId = payload?.sub;

  if (!authProviderId) {
    next(new UnauthenticatedError());
    return;
  }

  if (isMachineSubject(authProviderId)) {
    next();
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

/**
 * Throws rather than returning undefined, so controllers can rely on it.
 *
 * `requireAuth` has already run by the time any controller calls this, so an
 * unauthenticated request never gets here. The one caller left without a user
 * is a machine, which is why the message says so rather than offering to let
 * someone sign in.
 */
export function currentUser(req: Express.Request): UserDocument {
  if (!req.currentUser) {
    throw new UnauthenticatedError('This endpoint records who did it, so it needs a person.');
  }
  return req.currentUser;
}

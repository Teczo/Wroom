import type { ErrorRequestHandler, RequestHandler } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';

import { env } from '../config/env.js';
import { challengeHeader } from './protectedResourceMetadata.js';

/**
 * Leg one. This server is an OAuth 2.1 *resource server* — it verifies tokens,
 * it does not issue them. Auth0 is the authorization server, named in the
 * metadata document next door.
 *
 * The audience checked here is this server's own identifier, never the Wroom
 * API's. That is the whole point: a token minted for the Wroom API, or for any
 * other resource, is refused rather than accepted and passed along. The MCP
 * spec is blunt about it — a server "MUST only accept tokens that are valid for
 * use with their own resources" and "MUST NOT accept or transit any other
 * tokens" — and it is what stops a public URL becoming a way to spend this
 * server's Wroom credential.
 *
 * Nothing downstream reads the caller's identity. Verifying the token is the
 * entire job: it decides whether the request happens at all.
 */
export const verifyMcpToken: RequestHandler = auth({
  issuerBaseURL: `https://${env.auth0.domain}/`,
  audience: env.mcp.identifier,
});

/**
 * Turns a rejected token into the answer the MCP spec expects.
 *
 * A 401 without a `WWW-Authenticate` pointing at the metadata document leaves a
 * first-time client with nowhere to go, so the challenge rides on every one of
 * them. `express-oauth2-jwt-bearer` throws with a status and a safe message;
 * neither the token nor the reason it failed goes back over the wire.
 */
export function mcpAuthErrorHandler(publicUrl: string): ErrorRequestHandler {
  return (err, _req, res, next) => {
    const status = (err as { status?: unknown }).status;

    if (status === 401) {
      res
        .status(401)
        .set('WWW-Authenticate', challengeHeader(publicUrl))
        .json({ error: 'unauthorized', error_description: 'A valid access token is required.' });
      return;
    }

    if (status === 403) {
      res
        .status(403)
        .json({ error: 'insufficient_scope', error_description: 'That token is not allowed here.' });
      return;
    }

    next(err);
  };
}

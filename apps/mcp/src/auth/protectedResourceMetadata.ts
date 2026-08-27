import type { RequestHandler } from 'express';

import { env } from '../config/env.js';

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * This is how a client finds out where to go and get a token. The MCP spec
 * requires a server to publish it either here or in a `WWW-Authenticate`
 * header; this server does both, because a client that has never seen it
 * before arrives with no token and learns from the 401.
 *
 * Note what this document does *not* contain: any credential. It names the
 * authorization server and this resource's identifier, and nothing else.
 */

export const PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource';

export const protectedResourceMetadata: RequestHandler = (_req, res) => {
  res.json({
    resource: env.mcp.identifier,
    authorization_servers: [`https://${env.auth0.domain}/`],
    bearer_methods_supported: ['header'],
    scopes_supported: [],
  });
};

/**
 * The `WWW-Authenticate` value that goes on every 401, pointing a client at the
 * document above. Without it a client has no way to discover where to
 * authenticate and simply fails.
 */
export function challengeHeader(publicUrl: string): string {
  return `Bearer resource_metadata="${publicUrl}${PROTECTED_RESOURCE_METADATA_PATH}"`;
}

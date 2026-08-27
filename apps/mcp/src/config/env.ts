import 'dotenv/config';

/**
 * Environment loading. Everything this server needs is read once, here, so a
 * missing variable fails at boot rather than on the first tool call — the same
 * rule `apps/api/src/config/env.ts` follows.
 *
 * Two audiences live in here and they are not interchangeable. `mcp.identifier`
 * is this server's own Auth0 API identifier and is what an incoming token from
 * Claude has to be issued for. `wroom.audience` is the Wroom API's, and is what
 * this server asks Auth0 for when it goes to call `/api`. Mixing them up gives
 * you a server that either rejects every caller or forwards a token it should
 * not — see the note in `auth/requireMcpAuth.ts`.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy apps/mcp/.env.example to .env and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

const nodeEnv = optional('NODE_ENV', 'development');

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(optional('PORT', '4100')),

  auth0: {
    domain: required('AUTH0_DOMAIN'),
  },

  /** Leg one: what Claude connects to, and the audience its token must carry. */
  mcp: {
    /** Absolute URI. RFC 8707 requires it, and so does the MCP spec. */
    identifier: required('MCP_SERVER_IDENTIFIER'),
  },

  /** Leg two: this server's own credential for calling the Wroom API. */
  wroom: {
    apiUrl: required('WROOM_API_URL').replace(/\/+$/, ''),
    audience: required('AUTH0_AUDIENCE'),
    clientId: required('AUTH0_CLIENT_ID'),
    clientSecret: required('AUTH0_CLIENT_SECRET'),
  },
} as const;

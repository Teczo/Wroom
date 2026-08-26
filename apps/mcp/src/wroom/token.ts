import { env } from '../config/env.js';

/**
 * Leg two's credential: this server's own Auth0 token for calling the Wroom
 * API.
 *
 * It is deliberately not the token Claude presented. That one is audience-bound
 * to this server and the MCP spec forbids passing it on; the Wroom API would
 * reject it anyway, for the same reason. Two legs, two tokens, and they never
 * meet.
 *
 * A plain `client_credentials` exchange — no SDK needed for one POST.
 */

type CachedToken = { value: string; expiresAt: number };

let cached: CachedToken | null = null;
let inFlight: Promise<string> | null = null;

/** Refresh this far before the token actually expires, so no call races the edge. */
const REFRESH_MARGIN_MS = 60_000;

async function fetchToken(): Promise<string> {
  const response = await fetch(`https://${env.auth0.domain}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: env.wroom.clientId,
      client_secret: env.wroom.clientSecret,
      audience: env.wroom.audience,
    }),
  });

  if (!response.ok) {
    // The body can echo the client_id, so it does not go into the message.
    throw new Error(`Auth0 refused this server's credentials (${response.status}).`);
  }

  const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown };

  if (typeof body.access_token !== 'string') {
    throw new Error('Auth0 returned no access token.');
  }

  const lifetimeMs = typeof body.expires_in === 'number' ? body.expires_in * 1000 : 3_600_000;
  cached = { value: body.access_token, expiresAt: Date.now() + lifetimeMs - REFRESH_MARGIN_MS };

  return body.access_token;
}

/**
 * The current token, fetched once and reused until it is nearly expired.
 *
 * Concurrent callers share one in-flight request rather than each starting
 * their own — three tools firing at once should cost one round trip to Auth0,
 * not three.
 */
export async function wroomAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  inFlight ??= fetchToken().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Test seam and a way to force a refresh after a 401 from the API. */
export function clearCachedToken(): void {
  cached = null;
}

/**
 * Client configuration. Everything here is public by definition — Vite inlines
 * `VITE_*` values into the bundle, so no secret may ever be read this way.
 */

function read(name: string): string {
  return (import.meta.env[name] as string | undefined)?.trim() ?? '';
}

export const config = {
  apiBaseUrl: read('VITE_API_BASE_URL') || 'http://localhost:4000',
  auth0: {
    domain: read('VITE_AUTH0_DOMAIN'),
    clientId: read('VITE_AUTH0_CLIENT_ID'),
    audience: read('VITE_AUTH0_AUDIENCE'),
  },
};

/** The portal cannot sign anyone in without these — the shell says so plainly. */
export const isAuthConfigured = Boolean(config.auth0.domain && config.auth0.clientId);

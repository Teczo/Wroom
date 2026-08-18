import 'dotenv/config';

/**
 * Environment loading. Everything the API needs is read once, here, so a
 * missing variable fails at boot rather than on the first request that needs it.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy apps/api/.env.example to .env and fill it in.`,
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
  port: Number(optional('PORT', '4000')),

  mongodbUri: required('MONGODB_URI'),

  auth0: {
    domain: required('AUTH0_DOMAIN'),
    audience: required('AUTH0_AUDIENCE'),
  },

  /**
   * Storage is optional at boot so the API still runs before blob storage is
   * provisioned; the upload route reports it as unconfigured instead of crashing.
   */
  azureStorage: {
    connectionString: optional('AZURE_STORAGE_CONNECTION_STRING'),
    container: optional('AZURE_STORAGE_CONTAINER'),
    get configured(): boolean {
      return Boolean(this.connectionString && this.container);
    },
  },

  corsOrigins: optional('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

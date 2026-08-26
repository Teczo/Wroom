import { env } from '../config/env.js';
import { clearCachedToken, wroomAccessToken } from './token.js';

/**
 * The HTTP client for the Wroom API. Every call goes over the wire with this
 * server's own token (see `token.ts`) — nothing imports the API's service layer,
 * because `requireAuth` and `loadCurrentUser` are mounted on the Express router
 * and importing the services would walk straight past both.
 */

/** The envelope every `/api` route answers with. */
type Envelope<T> = { data: T; meta?: { total: number; page: number; limit: number } };

type ApiErrorBody = { error?: { code?: string; message?: string } };

export class WroomApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'WroomApiError';
    this.status = status;
    this.code = code;
  }
}

async function call<T>(
  path: string,
  init: { method: 'GET' } | { method: 'POST'; body: unknown },
  retryOnUnauthorized = true,
): Promise<Envelope<T>> {
  const token = await wroomAccessToken();

  const response = await fetch(`${env.wroom.apiUrl}${path}`, {
    method: init.method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.method === 'POST' ? { 'content-type': 'application/json' } : {}),
    },
    ...(init.method === 'POST' ? { body: JSON.stringify(init.body) } : {}),
  });

  // A token that expired between the cache check and the call. Drop it and go
  // once more, rather than surfacing an auth error the caller cannot act on.
  if (response.status === 401 && retryOnUnauthorized) {
    clearCachedToken();
    return call<T>(path, init, false);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new WroomApiError(
      response.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? `The Wroom API answered ${response.status}.`,
    );
  }

  return (await response.json()) as Envelope<T>;
}

export async function get<T>(path: string): Promise<Envelope<T>> {
  return call<T>(path, { method: 'GET' });
}

export async function post<T>(path: string, body: unknown): Promise<Envelope<T>> {
  return call<T>(path, { method: 'POST', body });
}

/** The API's own ceiling. Asking for more is clamped, so this is the fewest round trips. */
const MAX_PAGE_SIZE = 100;

/** Stops a mis-reported `total` from looping forever. */
const MAX_PAGES = 200;

/**
 * Reads a paginated list to exhaustion.
 *
 * This matters more than it looks. `/api/projects` and `/api/products` default
 * to 25 per page, and the only reason `wroom_list_context` exists is to show
 * which slugs are already taken. A short list means Claude picks a slug that
 * exists, and because the bootstrap importer matches on slug, the commit
 * quietly *updates* that project instead of creating a new one. The failure is
 * silent and it is exactly the one this tool is meant to prevent.
 */
export async function getAll<T>(path: string): Promise<T[]> {
  const separator = path.includes('?') ? '&' : '?';
  const items: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, meta } = await get<T[]>(
      `${path}${separator}page=${page}&limit=${MAX_PAGE_SIZE}`,
    );

    items.push(...data);

    // An unpaginated route answers with no meta worth paging on, and a page
    // shorter than the limit is the last one either way.
    if (!meta || items.length >= meta.total || data.length < MAX_PAGE_SIZE) break;
  }

  return items;
}

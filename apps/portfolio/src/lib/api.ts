import type { ApiError, ApiList, ApiSuccess, ListMeta } from '@wroom/shared';

/**
 * The one API client. Components never call `fetch` directly.
 *
 * Every request goes to `/public/*`, which is unauthenticated and reads the
 * published snapshot only. There is no token here and there never should be.
 */

const baseUrl = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:4000'
).replace(/\/$/, '');

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

async function request<T>(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(path.replace(/^\//, ''), `${baseUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString());
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as ApiError | null)?.error;
    throw new ApiRequestError(response.status, error?.message ?? 'That could not be loaded.');
  }

  return payload as T;
}

export async function publicGet<T>(path: string): Promise<T> {
  const payload = await request<ApiSuccess<T>>(path);
  return payload.data;
}

export async function publicList<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<{ items: T[]; meta: ListMeta }> {
  const payload = await request<ApiList<T>>(path, query);
  return { items: payload.data, meta: payload.meta };
}

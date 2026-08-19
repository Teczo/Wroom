import type { ApiError, ApiList, ApiSuccess, ListMeta } from '@wroom/shared';

import { config } from './config';

/**
 * The one API client. Components never call `fetch` directly.
 *
 * The Auth0 token getter is injected once at startup rather than imported here,
 * so this module stays free of React and can be used from anywhere.
 */

type TokenGetter = () => Promise<string | null>;

let getToken: TokenGetter = async () => null;

export function setTokenGetter(getter: TokenGetter): void {
  getToken = getter;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-level messages from a VALIDATION_FAILED response, for form display. */
  get fieldErrors(): Record<string, string> {
    const output: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.details ?? {})) {
      if (Array.isArray(value)) output[key] = String(value[0]);
      else if (typeof value === 'string') output[key] = value;
    }
    return output;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
};

function buildUrl(path: string, query: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), `${config.apiBaseUrl.replace(/\/$/, '')}/`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getToken();

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal ?? null,
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as ApiError | null)?.error;
    throw new ApiRequestError(
      response.status,
      error?.code ?? 'INTERNAL',
      error?.message ?? 'Something went wrong. Try again.',
      error?.details,
    );
  }

  return payload as T;
}

/**
 * Fetches a file and hands it to the browser to save.
 *
 * It cannot be a plain link: `/api/*` needs the bearer token, and an anchor
 * sends no headers. So the file is fetched, turned into a blob, and given to a
 * throwaway anchor — which is how a phone browser saves a file too.
 */
export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  const token = await getToken();

  const response = await fetch(buildUrl(path, undefined), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      'INTERNAL',
      'That file could not be downloaded. Try again.',
    );
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const named = /filename="?([^";]+)"?/i.exec(disposition)?.[1];

  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = named ?? fallbackFilename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

/** Unwraps `{ data }`. */
export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await request<ApiSuccess<T>>(path, { ...options, method: 'GET' });
  return payload.data;
}

/** Unwraps `{ data, meta }` and keeps the pagination totals. */
export async function apiList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ items: T[]; meta: ListMeta }> {
  const payload = await request<ApiList<T>>(path, { ...options, method: 'GET' });
  return { items: payload.data, meta: payload.meta };
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const payload = await request<ApiSuccess<T>>(path, { method: 'POST', body: body ?? {} });
  return payload?.data;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const payload = await request<ApiSuccess<T>>(path, { method: 'PATCH', body });
  return payload.data;
}

/**
 * A PATCH whose `meta` matters — the case study editor needs the publish-gate
 * verdict that comes back alongside the saved project.
 */
export async function apiPatchWithMeta<T, M>(
  path: string,
  body: unknown,
): Promise<{ data: T; meta: M }> {
  return request<{ data: T; meta: M }>(path, { method: 'PATCH', body });
}

export async function apiDelete(path: string): Promise<void> {
  await request<void>(path, { method: 'DELETE' });
}

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@wroom/shared';
import type { Request, Response } from 'express';

/**
 * Response envelope helpers. Every success body is `{ data }` or
 * `{ data, meta }` — see CLAUDE.md §6.
 */

export function sendData<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function sendList<T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; limit: number },
): void {
  res.status(200).json({ data, meta });
}

export type Pagination = { page: number; limit: number; skip: number };

export function parsePagination(req: Request): Pagination {
  const rawPage = Number(req.query.page ?? 1);
  const rawLimit = Number(req.query.limit ?? DEFAULT_PAGE_SIZE);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return { page, limit, skip: (page - 1) * limit };
}

/** Reads a single string query parameter, ignoring repeated/array forms. */
export function queryString(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

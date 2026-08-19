import { env } from '../config/env.js';

/**
 * Read-only access to Stripe's REST API over `fetch`.
 *
 * No SDK: the whole surface this ticket needs is one paginated GET, and
 * CLAUDE.md §3 does not name a Stripe client. Everything Stripe-shaped is
 * confined to this file, so swapping in the official package later means
 * rewriting this module and nothing else.
 *
 * This module never writes to Stripe. There is no verb here but GET.
 */

const STRIPE_API = 'https://api.stripe.com/v1';
const STRIPE_VERSION = '2024-06-20';
const PAGE_SIZE = 100;

/** 5,000 invoices in one run. A cap so a bad `since` cannot loop forever. */
const MAX_PAGES = 50;

/** Only the fields this sync reads. Stripe sends far more. */
export type StripeInvoice = {
  id: string;
  object: string;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' | null;
  metadata: Record<string, string> | null;
  amount_due: number;
  amount_paid: number;
  total: number;
  created: number;
  due_date: number | null;
  period_start: number | null;
  period_end: number | null;
  number: string | null;
  description: string | null;
  customer: string | null;
  customer_name: string | null;
  customer_email: string | null;
  status_transitions: { paid_at: number | null } | null;
};

type StripeList = { data: StripeInvoice[]; has_more: boolean };

/**
 * A Stripe request that did not succeed.
 *
 * Carries Stripe's own message so the portal can say what went wrong. The key
 * is never part of that message — it is only ever sent in a header, and this
 * class is constructed from the response body alone.
 */
export class StripeApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'StripeApiError';
    this.status = status;
  }
}

export function stripeConfigured(): boolean {
  return env.stripe.configured;
}

async function get(path: string, params: URLSearchParams): Promise<StripeList> {
  let response: Response;

  try {
    response = await fetch(`${STRIPE_API}${path}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.stripe.secretKey}`,
        'Stripe-Version': STRIPE_VERSION,
      },
    });
  } catch {
    // A DNS or socket failure. The cause is never anything the caller can act
    // on beyond "Stripe was unreachable", and the raw error can carry the URL.
    throw new StripeApiError(0, 'Stripe could not be reached.');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ??
      `Stripe returned ${response.status}.`;
    throw new StripeApiError(response.status, message);
  }

  return payload as StripeList;
}

/**
 * Every invoice created at or after `since`, oldest page first.
 *
 * `created[gte]` is the only time filter Stripe offers on this resource — there
 * is no "updated since". An invoice created before the window whose status
 * changes later is therefore not picked up by an incremental run; passing an
 * explicit `since` re-reads that period and updates it in place, which is what
 * the idempotent upsert exists for.
 */
export async function listInvoices(since: Date | null): Promise<StripeInvoice[]> {
  const invoices: StripeInvoice[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (since) params.set('created[gte]', String(Math.floor(since.getTime() / 1000)));
    if (startingAfter) params.set('starting_after', startingAfter);

    const batch = await get('/invoices', params);
    invoices.push(...batch.data);

    if (!batch.has_more || batch.data.length === 0) return invoices;
    startingAfter = batch.data[batch.data.length - 1]?.id;
    if (!startingAfter) return invoices;
  }

  throw new StripeApiError(
    0,
    `More than ${MAX_PAGES * PAGE_SIZE} invoices in that period. Sync a shorter period using a later "since" date.`,
  );
}

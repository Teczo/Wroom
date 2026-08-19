import {
  BASE_CURRENCY,
  STRIPE_PROJECT_SLUG_KEYS,
  type StripeSyncResult,
  type StripeUnmatchedInvoice,
} from '@wroom/shared';
import { MongoBulkWriteError } from 'mongodb';
import type { Types } from 'mongoose';

import { ProjectModel } from '../models/Project.js';
import { RevenueModel } from '../models/Revenue.js';
import {
  VendorConnectionModel,
  type VendorConnectionDocument,
} from '../models/VendorConnection.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';
import { recomputeProjectRollup } from './rollupService.js';
import {
  StripeApiError,
  listInvoices,
  stripeConfigured,
  type StripeInvoice,
} from './stripeClient.js';

/**
 * Stripe invoices in, as `revenue` records.
 *
 * Three properties hold this together.
 *
 * **It is re-runnable.** Every write is an upsert keyed on
 * `{ source: 'stripe', externalId }`, backed by the unique partial index from
 * WRM-034. A second run over the same period changes no row count; an invoice
 * whose amount moved in Stripe is updated where it sits.
 *
 * **It attributes rather than guesses.** `docs/DATA_MODEL.md` has no field
 * joining a Stripe customer to a project, so the only link is a project slug in
 * the invoice's own metadata. An invoice without one is reported back with
 * enough detail to fix it at the Stripe end, and nothing is written for it.
 *
 * **It writes all or nothing.** Reading and checking happen first, across the
 * whole batch; only once every invoice has passed does anything reach the
 * database. A Stripe outage or a non-AUD invoice therefore leaves the
 * collection exactly as it was, rather than half a period's revenue.
 */

const VENDOR = 'stripe';

/** Neither money in nor money owed: a draft was never sent, a void was cancelled. */
const NOT_BILLABLE = new Set(['draft', 'void']);

function roundAud(value: number): number {
  return Math.round(value * 100) / 100;
}

function unixToDate(seconds: number | null | undefined): Date | null {
  return typeof seconds === 'number' && seconds > 0 ? new Date(seconds * 1000) : null;
}

/** The project slug Stripe metadata carries, under either accepted spelling. */
function slugFromMetadata(invoice: StripeInvoice): string | null {
  const metadata = invoice.metadata ?? {};
  for (const key of STRIPE_PROJECT_SLUG_KEYS) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim().toLowerCase();
  }
  return null;
}

/** Free text, deliberately — there is no customers collection (ticket scope). */
function customerRefOf(invoice: StripeInvoice): string {
  return invoice.customer_name ?? invoice.customer_email ?? invoice.customer ?? '';
}

function descriptionOf(invoice: StripeInvoice): string {
  if (invoice.description && invoice.description.trim() !== '') return invoice.description.trim();
  return `Stripe invoice ${invoice.number ?? invoice.id}`;
}

/**
 * One invoice as a `revenue` document.
 *
 * `paid` and `paidAt` come from Stripe's own status and transition timestamps
 * and are never inferred — an invoice Stripe calls unpaid stays unpaid here,
 * and one with no recorded payment date keeps a null one rather than today's.
 *
 * The amount follows the same distinction: what was actually paid on a paid
 * invoice, what is still owed on an open one. Only paid rows reach the rollup,
 * so this is the difference between a Net figure and a wish.
 */
function toRevenue(invoice: StripeInvoice, projectId: Types.ObjectId) {
  const paid = invoice.status === 'paid';

  // Stripe amounts are in the smallest currency unit. AUD is a two-decimal
  // currency and a non-AUD invoice never reaches this function, so /100 holds.
  const amountAud = roundAud((paid ? invoice.amount_paid : invoice.amount_due) / 100);

  return {
    projectId,
    customerRef: customerRefOf(invoice),
    description: descriptionOf(invoice),
    amount: amountAud,
    currency: BASE_CURRENCY,
    amountAud,
    paid,
    paidAt: paid ? unixToDate(invoice.status_transitions?.paid_at) : null,
    dueAt: unixToDate(invoice.due_date),
    periodStart: unixToDate(invoice.period_start),
    periodEnd: unixToDate(invoice.period_end),
  };
}

// --- the connection ---------------------------------------------------------

export async function getStripeConnection(): Promise<VendorConnectionDocument | null> {
  return VendorConnectionModel.findOne({ vendor: VENDOR });
}

async function requireStripeConnection(): Promise<VendorConnectionDocument> {
  const connection = await getStripeConnection();
  if (!connection) throw new NotFoundError('A Stripe connection');
  return connection;
}

/**
 * Creates or updates the Stripe connection.
 *
 * The shape this accepts cannot express a credential: `secretRef` is validated
 * as a pointer, and the three sync-status fields are written by the sync alone.
 */
export async function saveStripeConnection(input: {
  accountId: string;
  authType: string;
  secretRef: string;
  syncEnabled: boolean;
}): Promise<VendorConnectionDocument> {
  return VendorConnectionModel.findOneAndUpdate(
    { vendor: VENDOR },
    { $set: { ...input, vendor: VENDOR } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

/**
 * Records how a run ended.
 *
 * `lastSyncAt` moves only on a clean run. Advancing it after a partial failure
 * would slide the window past the invoices that failed and quietly lose them;
 * leaving it put means the next run re-reads the same period, which is harmless
 * precisely because every write is an upsert.
 */
async function recordSync(
  connection: VendorConnectionDocument,
  outcome: { at: Date | null; status: 'ok' | 'failed'; error: string },
): Promise<void> {
  connection.set({
    ...(outcome.at ? { lastSyncAt: outcome.at } : {}),
    lastSyncStatus: outcome.status,
    lastSyncError: outcome.error,
  });
  await connection.save();
}

// --- the sync ---------------------------------------------------------------

type Matched = { invoice: StripeInvoice; projectId: Types.ObjectId };

/**
 * Splits a batch into what can be imported and what cannot, without writing.
 *
 * Order matters: drafts and voids drop out before attribution, so the unmatched
 * list Jaya has to act on holds only invoices that are real money and really
 * are missing their metadata.
 */
async function attribute(invoices: StripeInvoice[]): Promise<{
  matched: Matched[];
  unmatched: StripeUnmatchedInvoice[];
  notBillable: number;
}> {
  const billable = invoices.filter(
    (invoice) => invoice.status !== null && !NOT_BILLABLE.has(invoice.status),
  );

  const slugs = new Set<string>();
  for (const invoice of billable) {
    const slug = slugFromMetadata(invoice);
    if (slug) slugs.add(slug);
  }

  const projects = await ProjectModel.find({ slug: { $in: [...slugs] } })
    .select('_id slug')
    .lean();
  const bySlug = new Map(projects.map((project) => [project.slug, project._id]));

  const matched: Matched[] = [];
  const unmatched: StripeUnmatchedInvoice[] = [];

  for (const invoice of billable) {
    const slug = slugFromMetadata(invoice);
    const projectId = slug ? bySlug.get(slug) : undefined;

    if (!projectId) {
      unmatched.push({
        invoiceId: invoice.id,
        customerRef: customerRefOf(invoice),
        slug,
        reason: slug ? 'unknown-project' : 'no-slug',
      });
      continue;
    }

    matched.push({ invoice, projectId });
  }

  return { matched, unmatched, notBillable: invoices.length - billable.length };
}

/**
 * Refuses the whole run if any importable invoice is in another currency.
 *
 * `revenue` has no `fxRate` in `docs/DATA_MODEL.md`, so a converted figure
 * would carry no record of the rate behind it — a number nobody could check
 * later, sitting in the Net figure as though it were solid. Adding that field
 * is a schema decision, so this stops and says so instead.
 */
function assertAllAud(matched: Matched[]): void {
  const foreign = matched.filter((entry) => entry.invoice.currency.toUpperCase() !== BASE_CURRENCY);
  if (foreign.length === 0) return;

  const named = foreign
    .slice(0, 5)
    .map((entry) => `${entry.invoice.id} (${entry.invoice.currency.toUpperCase()})`)
    .join(', ');

  throw new UnprocessableError(
    `${foreign.length} invoice${foreign.length === 1 ? ' is' : 's are'} not in ${BASE_CURRENCY}: ` +
      `${named}${foreign.length > 5 ? ', and others' : ''}. Nothing was imported. Revenue records ` +
      `have no exchange-rate field, so converting these would store a figure with no rate behind ` +
      `it. Either invoice these in ${BASE_CURRENCY}, or add fxRate to docs/DATA_MODEL.md first.`,
    { invoiceIds: foreign.map((entry) => entry.invoice.id) },
  );
}

type WriteOutcome = { imported: number; updated: number; failed: number; failures: string[] };

/**
 * One unordered bulk upsert, keyed on the unique partial index from WRM-034.
 *
 * `upsertedCount` is what is new and `modifiedCount` is what actually changed,
 * so a second run over an unchanged period truthfully reports zero of both
 * rather than claiming to have updated everything it looked at.
 */
async function writeMatched(matched: Matched[]): Promise<WriteOutcome> {
  if (matched.length === 0) return { imported: 0, updated: 0, failed: 0, failures: [] };

  const operations = matched.map(({ invoice, projectId }) => ({
    updateOne: {
      filter: { source: VENDOR, externalId: invoice.id },
      update: { $set: toRevenue(invoice, projectId) },
      upsert: true,
    },
  }));

  try {
    const result = await RevenueModel.bulkWrite(operations, { ordered: false });
    return {
      imported: result.upsertedCount,
      updated: result.modifiedCount,
      failed: 0,
      failures: [],
    };
  } catch (error) {
    if (!(error instanceof MongoBulkWriteError)) throw error;

    // Unordered, so the rest of the batch still landed. Report what did not,
    // by invoice id — the driver's own message is internal detail.
    const writeErrors = Array.isArray(error.writeErrors) ? error.writeErrors : [error.writeErrors];

    return {
      imported: error.result?.upsertedCount ?? 0,
      updated: error.result?.modifiedCount ?? 0,
      failed: writeErrors.length,
      failures: writeErrors
        .slice(0, 5)
        .map((writeError) => matched[writeError?.index ?? -1]?.invoice.id ?? 'An invoice')
        .map((id) => `${id} could not be saved.`),
    };
  }
}

/**
 * Pulls invoices and writes them as revenue. On demand — there is no webhook
 * and no schedule (ticket, out of scope).
 */
export async function syncStripeRevenue(since?: Date | null): Promise<StripeSyncResult> {
  const connection = await requireStripeConnection();

  if (!connection.syncEnabled) {
    throw new UnprocessableError(
      'Syncing is switched off for this connection. Turn it on before running a sync.',
    );
  }

  if (!stripeConfigured()) {
    throw new UnprocessableError(
      'STRIPE_SECRET_KEY is not set in this environment, so there is no key to read invoices with. ' +
        'The connection records where the key lives; the key itself comes from the environment.',
    );
  }

  // Captured before the first read, so an invoice created while this runs falls
  // inside the next window rather than the gap between the two.
  const startedAt = new Date();
  const window = since ?? connection.lastSyncAt ?? null;

  let invoices: StripeInvoice[];
  let matched: Matched[];
  let unmatched: StripeUnmatchedInvoice[];
  let notBillable: number;

  try {
    invoices = await listInvoices(window);
    ({ matched, unmatched, notBillable } = await attribute(invoices));
    assertAllAud(matched);
  } catch (error) {
    // Nothing has been written at this point, by construction: reading and
    // checking both finish before the first upsert is built.
    const message =
      error instanceof StripeApiError || error instanceof UnprocessableError
        ? error.message
        : 'The sync could not be completed.';

    await recordSync(connection, { at: null, status: 'failed', error: message });

    // Stripe's own message is worth passing on — the ticket asks for an error
    // that names what Stripe returned, and it is safe to show: the key travels
    // in a header and never appears in a response body. Anything else is ours
    // and stays generic, so a genuine fault is logged as a 500 rather than
    // dressed up as something the caller did wrong.
    if (error instanceof StripeApiError) throw new UnprocessableError(message);
    throw error;
  }

  const written = await writeMatched(matched);

  // Once per project at the end, never per invoice (ticket scope).
  const affected = [...new Set(matched.map(({ projectId }) => String(projectId)))];
  for (const projectId of affected) {
    await recomputeProjectRollup(projectId);
  }

  const clean = written.failed === 0;
  await recordSync(connection, {
    at: clean ? startedAt : null,
    status: clean ? 'ok' : 'failed',
    error: clean ? '' : written.failures.join(' '),
  });

  return {
    imported: written.imported,
    updated: written.updated,
    skippedUnmatched: unmatched.length,
    failed: written.failed,
    skippedNotBillable: notBillable,
    unmatched,
    failures: written.failures,
    invoicesRead: invoices.length,
    projectsAffected: affected.length,
    since: window ? window.toISOString() : null,
    syncedAt: startedAt.toISOString(),
  };
}

import type { Infer, revenueCreateShape } from '@wroom/shared';

import { ProjectModel } from '../models/Project.js';
import { RevenueModel, type RevenueDocument } from '../models/Revenue.js';
import { NotFoundError, UnprocessableError, ValidationError } from '../utils/errors.js';
import { getProject } from './projectService.js';
import { recomputeProjectRollup } from './rollupService.js';

type RevenueInput = Infer<typeof revenueCreateShape>;

/**
 * Money in, entered by hand.
 *
 * Only paid entries reach `rollup.totalRevenueAud`. Outstanding revenue is
 * money someone has promised, not money that arrived, and rolling it up would
 * make every Net figure optimistic.
 */

function roundAud(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A paid entry has to say when it landed; an unpaid one has to say when it is
 * due. Either way the record answers "when", which is what makes the
 * outstanding list useful.
 */
function assertDatesMatchState(paid: boolean, paidAt: unknown, dueAt: unknown): void {
  if (paid && !paidAt) {
    throw new ValidationError('A paid entry needs the date it was paid.', {
      paidAt: 'Say when this was paid.',
    });
  }

  if (!paid && !dueAt) {
    throw new ValidationError('An unpaid entry needs a due date.', {
      dueAt: 'Say when this is due, so it can be chased.',
    });
  }
}

/**
 * A synced row belongs to Stripe.
 *
 * Editing one by hand is not refused to be strict about it — it is refused
 * because the next sync would overwrite the edit without saying so, and a
 * figure that silently reverts is worse than one you cannot change. Deleting is
 * still allowed: an invoice voided in Stripe leaves a row behind, and that row
 * has to be removable.
 */
function assertNotSynced(entry: RevenueDocument): void {
  if (entry.source !== 'stripe') return;

  throw new UnprocessableError(
    'This entry came from Stripe, so Stripe owns its figures — an edit here would be overwritten by the next sync. Change the invoice in Stripe and sync again.',
  );
}

export async function listRevenue(projectId: string): Promise<RevenueDocument[]> {
  await getProject(projectId);

  // Outstanding first, then most recent — what needs chasing leads.
  return RevenueModel.find({ projectId }).sort({ paid: 1, dueAt: 1, createdAt: -1 });
}

export async function getRevenue(id: string): Promise<RevenueDocument> {
  const entry = await RevenueModel.findById(id);
  if (!entry) throw new NotFoundError('That revenue entry');
  return entry;
}

export async function createRevenue(
  projectId: string,
  input: RevenueInput,
): Promise<RevenueDocument> {
  await getProject(projectId);
  assertDatesMatchState(input.paid, input.paidAt, input.dueAt);

  const entry = await RevenueModel.create({
    ...input,
    projectId,
    // AUD only for now, so the two figures agree by definition.
    amountAud: roundAud(input.amount),
    externalId: null,
  });

  await recomputeProjectRollup(projectId);
  return entry;
}

export async function updateRevenue(
  id: string,
  input: Partial<RevenueInput>,
): Promise<RevenueDocument> {
  const entry = await getRevenue(id);
  assertNotSynced(entry);

  const paid = input.paid ?? entry.paid;
  const paidAt = input.paidAt !== undefined ? input.paidAt : entry.paidAt;
  const dueAt = input.dueAt !== undefined ? input.dueAt : entry.dueAt;
  assertDatesMatchState(paid, paidAt, dueAt);

  entry.set(input);
  if (input.amount !== undefined) entry.set({ amountAud: roundAud(input.amount) });
  await entry.save();

  await recomputeProjectRollup(String(entry.projectId));
  return entry;
}

/** One action: it is paid, and this is when. */
export async function markRevenuePaid(id: string, paidAt: Date | null): Promise<RevenueDocument> {
  const entry = await getRevenue(id);
  assertNotSynced(entry);

  entry.set({ paid: true, paidAt: paidAt ?? new Date() });
  await entry.save();

  await recomputeProjectRollup(String(entry.projectId));
  return entry;
}

export async function deleteRevenue(id: string): Promise<void> {
  const entry = await getRevenue(id);
  const projectId = String(entry.projectId);

  await entry.deleteOne();
  await recomputeProjectRollup(projectId);
}

/** Paid and outstanding, kept apart — adding them together would be a lie. */
export type RevenueSummary = {
  paidAud: number;
  outstandingAud: number;
  overdueAud: number;
  entries: { paid: number; outstanding: number; overdue: number };
};

export async function summariseRevenue(): Promise<RevenueSummary> {
  const live = await ProjectModel.find({ status: { $ne: 'archived' } }).select('_id').lean();
  const match = { projectId: { $in: live.map((project) => project._id) } };
  const now = new Date();

  const rows = await RevenueModel.aggregate<{
    _id: { paid: boolean; overdue: boolean };
    total: number;
    count: number;
  }>([
    { $match: match },
    {
      $group: {
        _id: {
          paid: '$paid',
          overdue: {
            $and: [
              { $eq: ['$paid', false] },
              { $ne: ['$dueAt', null] },
              { $lt: ['$dueAt', now] },
            ],
          },
        },
        total: { $sum: '$amountAud' },
        count: { $sum: 1 },
      },
    },
  ]);

  const sum = (predicate: (row: (typeof rows)[number]) => boolean) =>
    rows.filter(predicate).reduce(
      (totals, row) => ({
        total: totals.total + row.total,
        count: totals.count + row.count,
      }),
      { total: 0, count: 0 },
    );

  const paid = sum((row) => row._id.paid);
  const outstanding = sum((row) => !row._id.paid);
  const overdue = sum((row) => row._id.overdue);

  return {
    paidAud: roundAud(paid.total),
    outstandingAud: roundAud(outstanding.total),
    overdueAud: roundAud(overdue.total),
    entries: { paid: paid.count, outstanding: outstanding.count, overdue: overdue.count },
  };
}

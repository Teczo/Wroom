import {
  BASE_CURRENCY,
  BILLING_CYCLES,
  countsTowardRunRate,
  monthlyRunRate,
  roundAud,
  totalSpend,
  type Infer,
  type costCreateShape,
} from '@wroom/shared';

import { CostModel, type CostDocument } from '../models/Cost.js';
import { ProjectModel } from '../models/Project.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';
import { getProject } from './projectService.js';
import { recomputeProjectRollup, sumCostsByCycle } from './rollupService.js';

type CostInput = Infer<typeof costCreateShape>;

export type CostListFilters = {
  vendor?: string;
  billingCycle?: string;
};

export async function listCosts(
  projectId: string,
  filters: CostListFilters,
  pagination: Pagination,
): Promise<{ items: CostDocument[]; total: number }> {
  await getProject(projectId);

  const query: Record<string, unknown> = { projectId };
  if (filters.vendor) query.vendor = filters.vendor;
  if (filters.billingCycle) query.billingCycle = filters.billingCycle;

  const [items, total] = await Promise.all([
    CostModel.find(query)
      .sort({ periodStart: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    CostModel.countDocuments(query),
  ]);

  return { items, total };
}

/**
 * All money is stored in AUD, converted at entry. A non-AUD amount must arrive
 * with either the converted figure or the rate to convert it — guessing a rate
 * server-side would silently invent a number.
 */
function toAud(input: Pick<CostInput, 'amount' | 'currency' | 'amountAud' | 'fxRate'>): number {
  if (input.currency === BASE_CURRENCY) return input.amount;
  if (input.amountAud !== null && input.amountAud !== undefined) return input.amountAud;
  if (input.fxRate) return Math.round(input.amount * input.fxRate * 100) / 100;

  throw new UnprocessableError(
    `A ${input.currency} amount needs either amountAud or fxRate so it can be stored in ${BASE_CURRENCY}.`,
    { currency: input.currency },
  );
}

export async function createCost(projectId: string, input: CostInput): Promise<CostDocument> {
  await getProject(projectId);

  const cost = await CostModel.create({
    ...input,
    projectId,
    amountAud: toAud(input),
  });

  await recomputeProjectRollup(projectId);
  return cost;
}

export async function updateCost(
  projectId: string,
  id: string,
  input: Partial<CostInput>,
): Promise<CostDocument> {
  const cost = await getCost(projectId, id);

  // Only re-derive the AUD figure when something it depends on actually changed,
  // so editing a description on a foreign-currency cost never needs a rate again.
  const touchesMoney =
    input.amount !== undefined ||
    input.currency !== undefined ||
    input.amountAud !== undefined ||
    input.fxRate !== undefined;

  const amountAud = touchesMoney
    ? toAud({
        amount: input.amount ?? cost.amount,
        currency: input.currency ?? cost.currency,
        amountAud: input.amountAud ?? null,
        fxRate: input.fxRate ?? cost.fxRate ?? null,
      })
    : cost.amountAud;

  cost.set({ ...input, amountAud });
  await cost.save();

  await recomputeProjectRollup(projectId);
  return cost;
}

export async function getCost(projectId: string, id: string): Promise<CostDocument> {
  const cost = await CostModel.findOne({ _id: id, projectId });
  if (!cost) throw new NotFoundError('That cost');
  return cost;
}

export async function deleteCost(projectId: string, id: string): Promise<void> {
  const cost = await getCost(projectId, id);
  await cost.deleteOne();
  await recomputeProjectRollup(projectId);
}

/** What everything costs, across every project still being worked on. */
export type CostSummary = {
  monthlyRunRateAud: number;
  totalSpendAud: number;
  byBillingCycle: Array<{
    billingCycle: string;
    totalAud: number;
    /** Whether this cycle feeds the run-rate, so the UI need not decide. */
    countsTowardRunRate: boolean;
  }>;
  byVendor: Array<{ vendor: string; totalAud: number; entries: number }>;
};

export async function summariseCosts(): Promise<CostSummary> {
  // Archived projects are retired: their costs are history, not run-rate.
  const live = await ProjectModel.find({ status: { $ne: 'archived' } }).select('_id').lean();
  const projectIds = live.map((project) => project._id);
  const match = { projectId: { $in: projectIds } };

  const [totalsByCycle, vendorRows] = await Promise.all([
    sumCostsByCycle(match),
    CostModel.aggregate<{ _id: string; totalAud: number; entries: number }>([
      { $match: match },
      { $group: { _id: '$vendor', totalAud: { $sum: '$amountAud' }, entries: { $sum: 1 } } },
      { $sort: { totalAud: -1 } },
    ]),
  ]);

  return {
    monthlyRunRateAud: monthlyRunRate(totalsByCycle),
    totalSpendAud: totalSpend(totalsByCycle),
    byBillingCycle: BILLING_CYCLES.map((billingCycle) => ({
      billingCycle,
      totalAud: roundAud(totalsByCycle[billingCycle] ?? 0),
      countsTowardRunRate: countsTowardRunRate(billingCycle),
    })),
    byVendor: vendorRows.map((row) => ({
      vendor: row._id,
      totalAud: roundAud(row.totalAud),
      entries: row.entries,
    })),
  };
}

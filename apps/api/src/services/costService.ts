import { BASE_CURRENCY, type Infer, type costCreateShape } from '@wroom/shared';

import { CostModel, type CostDocument } from '../models/Cost.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';
import { getProject } from './projectService.js';
import { recomputeProjectRollup } from './rollupService.js';

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

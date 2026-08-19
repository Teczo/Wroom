import { Types } from 'mongoose';

import { CostModel } from '../models/Cost.js';
import { FeatureModel } from '../models/Feature.js';
import { ProjectModel } from '../models/Project.js';
import { RevenueModel } from '../models/Revenue.js';
import { TimeEntryModel } from '../models/TimeEntry.js';

/**
 * `projects.rollup` is denormalised so the dashboard is a single cheap read.
 *
 * It is recomputed here — and only here — whenever a feature, cost or time
 * entry changes for a project. No change streams (CLAUDE.md §6).
 */

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

async function featureRollup(projectId: Types.ObjectId) {
  const rows = await FeatureModel.aggregate<{ _id: string; count: number }>([
    { $match: { projectId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byStatus = new Map(rows.map((row) => [row._id, row.count]));
  const featureCounts = {
    backlog: byStatus.get('backlog') ?? 0,
    todo: byStatus.get('todo') ?? 0,
    inProgress: byStatus.get('in-progress') ?? 0,
    blocked: byStatus.get('blocked') ?? 0,
    done: byStatus.get('done') ?? 0,
  };

  // Every status counts toward the denominator, including `review`, which has no
  // bucket of its own in the rollup shape.
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const percentComplete = total === 0 ? 0 : round((featureCounts.done / total) * 100, 1);

  return { featureCounts, percentComplete };
}

async function costRollup(projectId: Types.ObjectId) {
  const rows = await CostModel.aggregate<{ _id: string; total: number }>([
    { $match: { projectId } },
    { $group: { _id: '$billingCycle', total: { $sum: '$amountAud' } } },
  ]);

  const byCycle = new Map(rows.map((row) => [row._id, row.total]));

  // Run-rate rule: monthly + annual/12. One-off and usage are excluded.
  const monthlyCostAud = round((byCycle.get('monthly') ?? 0) + (byCycle.get('annual') ?? 0) / 12);
  const totalSpendAud = round(rows.reduce((sum, row) => sum + row.total, 0));

  return { monthlyCostAud, totalSpendAud };
}

/**
 * Paid entries only. Outstanding revenue is a promise, not money in — rolling
 * it up would make every Net figure read better than reality.
 */
async function revenueRollup(projectId: Types.ObjectId) {
  const [row] = await RevenueModel.aggregate<{ total: number }>([
    { $match: { projectId, paid: true } },
    { $group: { _id: null, total: { $sum: '$amountAud' } } },
  ]);

  return { totalRevenueAud: round(row?.total ?? 0) };
}

async function timeRollup(projectId: Types.ObjectId) {
  const [row] = await TimeEntryModel.aggregate<{ totalHours: number; timeCostAud: number }>([
    { $match: { projectId } },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
        timeCostAud: { $sum: { $multiply: ['$hours', '$rateAud'] } },
      },
    },
  ]);

  return {
    totalHours: round(row?.totalHours ?? 0),
    timeCostAud: round(row?.timeCostAud ?? 0),
  };
}

async function lastActivityAt(projectId: Types.ObjectId): Promise<Date | null> {
  const [feature, cost, time] = await Promise.all([
    FeatureModel.findOne({ projectId }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    CostModel.findOne({ projectId }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    TimeEntryModel.findOne({ projectId }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
  ]);

  const stamps = [feature?.updatedAt, cost?.updatedAt, time?.updatedAt].filter(
    (value): value is Date => value instanceof Date,
  );

  if (stamps.length === 0) return null;
  return stamps.reduce((latest, value) => (value > latest ? value : latest));
}

/** Recomputes and persists the rollup. */
export async function recomputeProjectRollup(projectId: Types.ObjectId | string): Promise<void> {
  const id = typeof projectId === 'string' ? new Types.ObjectId(projectId) : projectId;

  const [features, costs, revenue, time, activity] = await Promise.all([
    featureRollup(id),
    costRollup(id),
    revenueRollup(id),
    timeRollup(id),
    lastActivityAt(id),
  ]);

  await ProjectModel.updateOne(
    { _id: id },
    {
      $set: {
        'rollup.featureCounts': features.featureCounts,
        'rollup.percentComplete': features.percentComplete,
        'rollup.monthlyCostAud': costs.monthlyCostAud,
        'rollup.totalSpendAud': costs.totalSpendAud,
        'rollup.totalRevenueAud': revenue.totalRevenueAud,
        'rollup.totalHours': time.totalHours,
        'rollup.timeCostAud': time.timeCostAud,
        'rollup.lastActivityAt': activity,
      },
    },
  );
}

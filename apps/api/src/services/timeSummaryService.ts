import { Types } from 'mongoose';

import { FeatureModel } from '../models/Feature.js';
import { TimeEntryModel } from '../models/TimeEntry.js';
import { NotFoundError } from '../utils/errors.js';
import { getProject } from './projectService.js';

/**
 * Effort, reported apart from money.
 *
 * Cost here is hours × the rate snapshotted on each entry — never the user's
 * current rate. Changing what you charge does not rewrite what past work cost,
 * which is the entire reason the snapshot exists.
 *
 * Nothing in this file feeds `monthlyCostAud`, `totalSpendAud` or Net. Time
 * cost measures effort; hosting spend measures money out. Adding them makes
 * both meaningless.
 */

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export type TimeWindow = { from?: Date; to?: Date };

export type ActivityBreakdown = {
  activity: string;
  hours: number;
  /** Null when every entry was uncosted — not zero, which reads as free. */
  costAud: number | null;
  billableHours: number;
};

export type FeatureBreakdown = {
  featureId: string | null;
  ref: string | null;
  title: string | null;
  hours: number;
  costAud: number | null;
};

export type TimeSummary = {
  totalHours: number;
  timeCostAud: number;
  /** True when nothing logged carried a rate, so the UI can show a dash. */
  uncosted: boolean;
  byActivity: ActivityBreakdown[];
  byFeature: FeatureBreakdown[];
};

function dateFilter(window: TimeWindow): Record<string, unknown> {
  const range: Record<string, Date> = {};
  if (window.from) range.$gte = window.from;
  if (window.to) range.$lte = window.to;

  return Object.keys(range).length > 0 ? { date: range } : {};
}

/** A group's cost, or null when nothing in it carried a rate. */
function costOf(totalCost: number, costedHours: number): number | null {
  return costedHours === 0 ? null : round(totalCost);
}

async function summarise(
  match: Record<string, unknown>,
  window: TimeWindow,
): Promise<Omit<TimeSummary, 'byFeature'> & { featureRows: Array<{ _id: Types.ObjectId | null; hours: number; cost: number; costedHours: number }> }> {
  const query = { ...match, ...dateFilter(window) };

  const [totals, activityRows, featureRows] = await Promise.all([
    TimeEntryModel.aggregate<{ hours: number; cost: number; costedHours: number }>([
      { $match: query },
      {
        $group: {
          _id: null,
          hours: { $sum: '$hours' },
          cost: { $sum: { $multiply: ['$hours', '$rateAud'] } },
          costedHours: { $sum: { $cond: [{ $gt: ['$rateAud', 0] }, '$hours', 0] } },
        },
      },
    ]),

    TimeEntryModel.aggregate<{
      _id: string;
      hours: number;
      cost: number;
      costedHours: number;
      billableHours: number;
    }>([
      { $match: query },
      {
        $group: {
          _id: '$activity',
          hours: { $sum: '$hours' },
          cost: { $sum: { $multiply: ['$hours', '$rateAud'] } },
          costedHours: { $sum: { $cond: [{ $gt: ['$rateAud', 0] }, '$hours', 0] } },
          // Returned for display only — nothing here calculates from it.
          billableHours: { $sum: { $cond: ['$billable', '$hours', 0] } },
        },
      },
      { $sort: { hours: -1 } },
    ]),

    TimeEntryModel.aggregate<{
      _id: Types.ObjectId | null;
      hours: number;
      cost: number;
      costedHours: number;
    }>([
      { $match: query },
      {
        $group: {
          // Entries with no feature group under null — an unassigned bucket,
          // never dropped.
          _id: '$featureId',
          hours: { $sum: '$hours' },
          cost: { $sum: { $multiply: ['$hours', '$rateAud'] } },
          costedHours: { $sum: { $cond: [{ $gt: ['$rateAud', 0] }, '$hours', 0] } },
        },
      },
      { $sort: { hours: -1 } },
    ]),
  ]);

  const total = totals[0];

  return {
    totalHours: round(total?.hours ?? 0),
    timeCostAud: round(total?.cost ?? 0),
    uncosted: (total?.costedHours ?? 0) === 0,
    byActivity: activityRows.map((row) => ({
      activity: row._id,
      hours: round(row.hours),
      costAud: costOf(row.cost, row.costedHours),
      billableHours: round(row.billableHours),
    })),
    featureRows,
  };
}

export async function summariseProjectTime(
  projectId: string,
  window: TimeWindow,
): Promise<TimeSummary> {
  await getProject(projectId);

  const { featureRows, ...summary } = await summarise(
    { projectId: new Types.ObjectId(projectId) },
    window,
  );

  const featureIds = featureRows
    .map((row) => row._id)
    .filter((id): id is Types.ObjectId => id !== null);

  const features = await FeatureModel.find({ _id: { $in: featureIds } })
    .select('ref title')
    .lean();

  const byId = new Map(features.map((feature) => [String(feature._id), feature]));

  return {
    ...summary,
    byFeature: featureRows.map((row) => {
      const feature = row._id ? byId.get(String(row._id)) : undefined;

      return {
        featureId: row._id ? String(row._id) : null,
        ref: feature?.ref ?? null,
        title: feature?.title ?? (row._id ? null : 'Not against a feature'),
        hours: round(row.hours),
        costAud: costOf(row.cost, row.costedHours),
      };
    }),
  };
}

export async function summariseFeatureTime(
  featureId: string,
  window: TimeWindow,
): Promise<TimeSummary> {
  const feature = await FeatureModel.findById(featureId).select('_id').lean();
  if (!feature) throw new NotFoundError('That feature');

  const { featureRows, ...summary } = await summarise(
    { featureId: new Types.ObjectId(featureId) },
    window,
  );
  void featureRows;

  return { ...summary, byFeature: [] };
}

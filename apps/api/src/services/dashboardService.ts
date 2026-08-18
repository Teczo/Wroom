import {
  PROJECT_STATUSES,
  type DashboardProjectRow,
  type DashboardSummary,
  type TrackedProjectStatus,
} from '@wroom/shared';

import { ProjectModel } from '../models/Project.js';

/**
 * The dashboard read. Everything comes from `projects` and its denormalised
 * `rollup` — costs, time entries and features are never queried here, which is
 * the whole point of the rollup existing.
 *
 * One aggregation with `$facet` rather than three round trips, so the page is a
 * single read no matter how many projects there are.
 */

/** Archived projects are retired: absent from counts, totals and the list. */
const TRACKED_STATUSES = PROJECT_STATUSES.filter(
  (status): status is TrackedProjectStatus => status !== 'archived',
);

/** Enough rows to see what has gone quiet without turning into a project list. */
const LEAST_RECENT_LIMIT = 8;

type Facets = {
  counts: Array<{ _id: string; count: number }>;
  totals: Array<{ projects: number; monthlyCostAud: number; totalSpendAud: number }>;
  leastRecentlyActive: DashboardProjectRow[];
};

function zeroFilledCounts(): Record<TrackedProjectStatus, number> {
  return Object.fromEntries(TRACKED_STATUSES.map((status) => [status, 0])) as Record<
    TrackedProjectStatus,
    number
  >;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [facets] = await ProjectModel.aggregate<Facets>([
    { $match: { status: { $ne: 'archived' } } },
    {
      $facet: {
        counts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        totals: [
          {
            $group: {
              _id: null,
              projects: { $sum: 1 },
              monthlyCostAud: { $sum: '$rollup.monthlyCostAud' },
              totalSpendAud: { $sum: '$rollup.totalSpendAud' },
            },
          },
          { $project: { _id: 0 } },
        ],
        leastRecentlyActive: [
          // Ascending puts null first, so projects that have never had activity
          // lead the list. That is the point of the list, not an accident.
          { $sort: { 'rollup.lastActivityAt': 1, name: 1 } },
          { $limit: LEAST_RECENT_LIMIT },
          {
            $project: {
              name: 1,
              slug: 1,
              status: 1,
              percentComplete: '$rollup.percentComplete',
              monthlyCostAud: '$rollup.monthlyCostAud',
              totalSpendAud: '$rollup.totalSpendAud',
              lastActivityAt: '$rollup.lastActivityAt',
            },
          },
        ],
      },
    },
  ]);

  const statusCounts = zeroFilledCounts();
  for (const row of facets?.counts ?? []) {
    if (row._id in statusCounts) statusCounts[row._id as TrackedProjectStatus] = row.count;
  }

  const totals = facets?.totals[0];

  return {
    statusCounts,
    totals: {
      projects: totals?.projects ?? 0,
      monthlyCostAud: totals?.monthlyCostAud ?? 0,
      totalSpendAud: totals?.totalSpendAud ?? 0,
    },
    leastRecentlyActive: facets?.leastRecentlyActive ?? [],
  };
}

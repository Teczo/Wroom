import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../lib/api';

export type CostSummary = {
  monthlyRunRateAud: number;
  totalSpendAud: number;
  byBillingCycle: Array<{
    billingCycle: string;
    totalAud: number;
    countsTowardRunRate: boolean;
  }>;
  byVendor: Array<{ vendor: string; totalAud: number; entries: number }>;
};

/** Portfolio-wide totals. Archived projects are already excluded server-side. */
export function useCostSummary() {
  return useQuery({
    queryKey: ['costs', 'summary'],
    queryFn: () => apiGet<CostSummary>('/api/costs/summary'),
  });
}

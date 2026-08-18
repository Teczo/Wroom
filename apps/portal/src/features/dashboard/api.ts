import type { DashboardSummary } from '@wroom/shared';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../lib/api';

export const dashboardKeys = {
  summary: ['dashboard', 'summary'] as const,
};

/** One request for the whole home screen — the API does the aggregation. */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: () => apiGet<DashboardSummary>('/api/dashboard'),
  });
}

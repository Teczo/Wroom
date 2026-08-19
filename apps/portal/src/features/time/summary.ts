import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../lib/api';

export type ActivityBreakdown = {
  activity: string;
  hours: number;
  /** Null when nothing in the group carried a rate — show a dash, not $0.00. */
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
  uncosted: boolean;
  byActivity: ActivityBreakdown[];
  byFeature: FeatureBreakdown[];
};

export function useProjectTimeSummary(projectId: string) {
  return useQuery({
    queryKey: ['time-summary', 'project', projectId],
    queryFn: () => apiGet<TimeSummary>(`/api/projects/${projectId}/time-summary`),
  });
}

export function useFeatureTimeSummary(featureId: string, enabled = true) {
  return useQuery({
    queryKey: ['time-summary', 'feature', featureId],
    queryFn: () => apiGet<TimeSummary>(`/api/features/${featureId}/time-summary`),
    enabled,
  });
}

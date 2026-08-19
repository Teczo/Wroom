import type { StripeSyncResult, VendorConnection } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost, apiPut } from '../../lib/api';
import { projectKeys } from '../projects/api';

export const integrationKeys = {
  stripe: ['integrations', 'stripe'] as const,
};

/** Null when nothing has been connected yet — the page renders that state. */
export function useStripeConnection() {
  return useQuery({
    queryKey: integrationKeys.stripe,
    queryFn: () => apiGet<VendorConnection | null>('/api/integrations/stripe'),
  });
}

export function useSaveStripeConnection() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      accountId: string;
      authType: string;
      secretRef: string;
      syncEnabled: boolean;
    }) => apiPut<VendorConnection>('/api/integrations/stripe', input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: integrationKeys.stripe });
    },
  });
}

/**
 * A sync moves revenue, which moves every affected project's rollup. Rather
 * than guess which projects those were, the whole project cache is invalidated
 * alongside the connection.
 */
export function useSyncStripe() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<StripeSyncResult>('/api/integrations/stripe/sync'),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: integrationKeys.stripe }),
        client.invalidateQueries({ queryKey: projectKeys.all }),
        client.invalidateQueries({ queryKey: ['revenue'] }),
      ]);
    },
  });
}

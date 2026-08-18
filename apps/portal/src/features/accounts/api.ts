import type { Account } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from '../../lib/api';

export const accountKeys = {
  all: ['accounts'] as const,
  list: (vendor: string | undefined) => ['accounts', 'list', vendor ?? 'all'] as const,
  detail: (id: string) => ['accounts', 'detail', id] as const,
};

export function useAccounts(vendor?: string) {
  return useQuery({
    queryKey: accountKeys.list(vendor),
    queryFn: () => apiList<Account>('/api/accounts', { query: { vendor } }),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => apiGet<Account>(`/api/accounts/${id}`),
  });
}

export function useCreateAccount() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost<Account>('/api/accounts', input),
    onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useUpdateAccount(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPatch<Account>(`/api/accounts/${id}`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

/** Refused with 409 while any service still points at the account. */
export function useDeleteAccount(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => apiDelete(`/api/accounts/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

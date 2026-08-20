import type { Enquiry } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from '../../lib/api';

export const enquiryKeys = {
  all: ['enquiries'] as const,
  list: (status: string) => ['enquiries', 'list', status] as const,
  detail: (id: string) => ['enquiries', id] as const,
};

export function useEnquiries(filters: { status?: string } = {}) {
  return useQuery({
    queryKey: enquiryKeys.list(filters.status ?? 'default'),
    queryFn: () => apiList<Enquiry>('/api/enquiries', { query: { ...filters, limit: 100 } }),
  });
}

export function useEnquiry(id: string) {
  return useQuery({
    queryKey: enquiryKeys.detail(id),
    queryFn: () => apiGet<Enquiry>(`/api/enquiries/${id}`),
    enabled: id !== '',
  });
}

/**
 * How many are still unread, for the marker in the shell.
 *
 * It asks for one row and reads the total off the pagination meta, so the
 * count needs no endpoint of its own.
 */
export function useNewEnquiryCount() {
  return useQuery({
    queryKey: enquiryKeys.list('new-count'),
    queryFn: () => apiList<Enquiry>('/api/enquiries', { query: { status: 'new', limit: 1 } }),
    select: (payload) => payload.meta.total,
    staleTime: 60_000,
  });
}

function useEnquiryMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: enquiryKeys.all }),
  });
}

export function useUpdateEnquiry(id: string) {
  return useEnquiryMutation((input: Record<string, unknown>) =>
    apiPatch<Enquiry>(`/api/enquiries/${id}`, input),
  );
}

export function useCreateEnquiry() {
  return useEnquiryMutation((input: Record<string, unknown>) =>
    apiPost<Enquiry>('/api/enquiries', input),
  );
}

export function useDeleteEnquiry(id: string) {
  return useEnquiryMutation(() => apiDelete(`/api/enquiries/${id}`));
}

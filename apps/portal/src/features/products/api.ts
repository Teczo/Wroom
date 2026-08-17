import type { Product } from '@wroom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiList, apiPatch, apiPost } from '../../lib/api';

const key = ['products'] as const;

export function useProducts() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiList<Product>('/api/products', { query: { limit: 100 } }),
  });
}

export function useCreateProduct() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost<Product>('/api/products', input),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateProduct(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPatch<Product>(`/api/products/${id}`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

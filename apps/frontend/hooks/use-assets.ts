'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Asset {
  id: string;
  type: 'etf' | 'crypto' | 'gold' | 'apartment';
  name: string;
  value: number;
  quantity?: number;
  costBasis?: number;
  currency: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data } = await apiClient.get<Asset[]>('/assets');
      return data;
    },
  });
}

export function useNetWorth() {
  return useQuery({
    queryKey: ['assets', 'net-worth'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ total: number; assets: Asset[] }>('/assets/net-worth');
      return data;
    },
  });
}

export interface CreateAssetInput {
  type: Asset['type'];
  name: string;
  value: number;
  quantity?: number;
  costBasis?: number;
  currency?: string;
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const { data } = await apiClient.post<Asset>('/assets', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
    },
  });
}

export function useUpdateAsset(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreateAssetInput>) => {
      const { data } = await apiClient.patch<Asset>(`/assets/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
    },
  });
}

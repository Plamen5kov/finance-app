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
  latestPrice?: number;
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
  metadata?: Record<string, unknown>;
}

export interface RefreshResult {
  updated: number;
  errors: string[];
  backfilled: number;
}

export function useRefreshPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<RefreshResult>('/price-tracking/refresh');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
    },
  });
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

export interface AssetSnapshot {
  id: string;
  assetId: string;
  value: number;
  price?: number;
  quantity?: number;
  capturedAt: string;
}

export function useAssetSnapshots(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'snapshots'],
    queryFn: async () => {
      const { data } = await apiClient.get<AssetSnapshot[]>(`/assets/${assetId}/snapshots`);
      return data;
    },
  });
}

export function useAddAssetSnapshot(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { value: number; date: string; price?: number; quantity?: number }) => {
      const { data } = await apiClient.post<AssetSnapshot>(`/assets/${assetId}/snapshots`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', assetId, 'snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth', 'history'] });
    },
  });
}

export function useDeleteAssetSnapshot(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      await apiClient.delete(`/assets/${assetId}/snapshots/${snapshotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', assetId, 'snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth', 'history'] });
    },
  });
}

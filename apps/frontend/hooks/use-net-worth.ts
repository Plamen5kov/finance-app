'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface NetWorthSummary {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface NetWorthHistoryItem {
  name: string;
  type: string;
  value: number;
  isLiability: boolean;
}

export interface NetWorthHistoryPoint {
  month: string;
  netWorth: number;
  items: NetWorthHistoryItem[];
}

export interface ProjectedLiability {
  name: string;
  type: string;
  balance: number;
}

export interface NetWorthProjectionPoint {
  month: string;
  projectedNetWorth: number;
  liabilities: ProjectedLiability[];
}

export interface NetWorthProjection {
  payoffMonth: string | null;
  points: NetWorthProjectionPoint[];
}

export interface AllocationItem {
  type: string;
  value: number;
  pct: number;
}

export function useNetWorthSummary() {
  return useQuery({
    queryKey: ['net-worth'],
    queryFn: async () => {
      const { data } = await apiClient.get<NetWorthSummary>('/net-worth');
      return data;
    },
  });
}

export function useNetWorthHistory() {
  return useQuery({
    queryKey: ['net-worth', 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get<NetWorthHistoryPoint[]>('/net-worth/history');
      return data;
    },
  });
}

export function useNetWorthProjection() {
  return useQuery({
    queryKey: ['net-worth', 'projection'],
    queryFn: async () => {
      const { data } = await apiClient.get<NetWorthProjection>('/net-worth/projection');
      return data;
    },
  });
}

export function useAssetAllocation() {
  return useQuery({
    queryKey: ['assets', 'allocation'],
    queryFn: async () => {
      const { data } = await apiClient.get<AllocationItem[]>('/assets/allocation');
      return data;
    },
  });
}

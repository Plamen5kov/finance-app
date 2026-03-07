'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MortgageMetadata, LoanMetadata, LeasingMetadata, MortgageEvent, MortgageEventType } from '@finances/shared';

export type { MortgageMetadata, LoanMetadata, LeasingMetadata, MortgageEvent, MortgageEventType } from '@finances/shared';
export { MORTGAGE_EVENT_TYPES } from '@finances/shared';

export interface Liability {
  id: string;
  type: 'mortgage' | 'loan' | 'leasing';
  name: string;
  value: number;
  currency: string;
  metadata?: MortgageMetadata | LoanMetadata | LeasingMetadata | null;
  createdAt: string;
}

export interface LiabilitySnapshot {
  liabilityId: string;
  value: number;
  capturedAt: string;
}

export interface LiabilityWithHistory extends Liability {
  snapshots: LiabilitySnapshot[];
}

export interface CreateLiabilityInput {
  type: Liability['type'];
  name: string;
  value: number;
  currency?: string;
  metadata?: MortgageMetadata | LoanMetadata | LeasingMetadata;
}

export function useLiabilities() {
  return useQuery({
    queryKey: ['liabilities'],
    queryFn: async () => {
      const { data } = await apiClient.get<Liability[]>('/liabilities');
      return data;
    },
  });
}

export function useLiabilitiesHistory() {
  return useQuery({
    queryKey: ['liabilities', 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get<LiabilityWithHistory[]>('/liabilities/history');
      return data;
    },
  });
}

export function useCreateLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLiabilityInput) => {
      const { data } = await apiClient.post<Liability>('/liabilities', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
    },
  });
}

export function useUpdateLiability(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreateLiabilityInput>) => {
      const { data } = await apiClient.patch<Liability>(`/liabilities/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
    },
  });
}

export function useDeleteLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/liabilities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
    },
  });
}

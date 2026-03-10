'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  currentAmount: number;
  recurringPeriod: 'monthly' | 'annual' | null;
  priority: number;
  status: 'active' | 'at_risk' | 'completed' | 'archived';
  description?: string;
  category?: string;
  createdAt: string;
}

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  recurringPeriod?: 'monthly' | 'annual' | null;
  priority?: number;
  description?: string;
  category?: string;
}

export function useGoals(params?: { recurringPeriod?: string }) {
  return useQuery({
    queryKey: ['goals', params],
    queryFn: async () => {
      const { data } = await apiClient.get<Goal[]>('/goals', { params });
      return data;
    },
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goals', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Goal>(`/goals/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { data } = await apiClient.post<Goal>('/goals', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreateGoalInput>) => {
      const { data } = await apiClient.patch<Goal>(`/goals/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/goals/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export interface EmergencyFundCategory {
  id: string;
  name: string;
  avgMonthly: number;
  type: string;
}

export interface EmergencyFundAdvice {
  categories: EmergencyFundCategory[];
  existingGoal: Goal | null;
}

export function useEmergencyFundAdvice() {
  return useQuery({
    queryKey: ['goals', 'emergency-fund-advice'],
    queryFn: async () => {
      const { data } = await apiClient.get<EmergencyFundAdvice>('/goals/emergency-fund/advice');
      return data;
    },
  });
}

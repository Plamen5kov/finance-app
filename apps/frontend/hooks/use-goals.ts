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
  emergencyBadge?: { covered: number; target: number } | null;
}

export interface GoalSummary {
  activeCount: number;
  completedCount: number;
  avgProgress: number;
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

export interface FixedPayment {
  id: string;
  name: string;
  type: string;
  monthlyPayment: number;
}

export interface EmergencyFundAdvice {
  categories: EmergencyFundCategory[];
  fixedPayments: FixedPayment[];
  existingGoal: Goal | null;
}

export interface BudgetSuggestion {
  goalId: string;
  goalName: string;
  priority: number;
  category: string | null;
  remaining: number;
  monthsLeft: number | null;
  idealMonthly: number;
  suggestedAmount: number;
  pctComplete: number;
  type: 'on_track' | 'behind' | 'ahead' | 'overdue' | 'completed_soon';
}

export interface GoalBudgetAdvice {
  snapshot: {
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    essentialExpenses: number;
    maxSavings: number;
    freeMoney: number;
    monthsAnalyzed: number;
  };
  suggestions: BudgetSuggestion[];
}

export function useGoalSummary() {
  return useQuery({
    queryKey: ['goals', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<GoalSummary>('/goals/summary');
      return data;
    },
  });
}

export function useGoalBudgetAdvice() {
  return useQuery({
    queryKey: ['goals', 'budget-advice'],
    queryFn: async () => {
      const { data } = await apiClient.get<GoalBudgetAdvice>('/goals/budget-advice');
      return data;
    },
  });
}

export interface GoalProgress {
  id: string;
  goalId: string;
  month: string;
  balanceAsOf: number;
  actualSavedThisMonth: number;
}

export function useGoalProgress(goalId: string) {
  return useQuery({
    queryKey: ['goals', goalId, 'progress'],
    queryFn: async () => {
      const { data } = await apiClient.get<GoalProgress[]>(`/goals/${goalId}/progress`);
      return data;
    },
    enabled: !!goalId,
  });
}

export function useAddGoalProgress(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { month: string; amount: number }) => {
      const { data } = await apiClient.post(`/goals/${goalId}/progress`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteGoalProgress(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      await apiClient.delete(`/goals/${goalId}/progress/${snapshotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
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

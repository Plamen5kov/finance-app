'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ExpenseCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  category?: ExpenseCategory;
  notes?: string;
  isRecurring: boolean;
  createdAt: string;
}

export interface CreateExpenseInput {
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  notes?: string;
  isRecurring?: boolean;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  total: number;
  byCategory: { categoryId: string; name: string; total: number }[];
}

export function useExpenses(params?: { month?: string; categoryId?: string }) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const { data } = await apiClient.get<Expense[]>('/expenses', { params });
      return data;
    },
  });
}

export function useMonthlySummary(month?: string) {
  return useQuery({
    queryKey: ['expenses', 'summary', month],
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlySummary>('/expenses/summary/monthly', {
        params: month ? { month } : undefined,
      });
      return data;
    },
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpenseCategory[]>('/expenses/categories');
      return data;
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data } = await apiClient.post<Expense>('/expenses', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/expenses/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: string; icon?: string }) => {
      const { data } = await apiClient.post<ExpenseCategory>('/expenses/categories', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expense-categories'] }),
  });
}

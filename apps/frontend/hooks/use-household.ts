'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface HouseholdMember {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: string;
}

export interface HouseholdInvite {
  id: string;
  token: string;
  role: string;
  link: string;
  expiresAt: string;
  createdAt: string;
}

export function useHouseholdMembers() {
  return useQuery({
    queryKey: ['household', 'members'],
    queryFn: async () => {
      const { data } = await apiClient.get<HouseholdMember[]>('/household/members');
      return data;
    },
  });
}

export function useHouseholdInvites() {
  return useQuery({
    queryKey: ['household', 'invites'],
    queryFn: async () => {
      const { data } = await apiClient.get<HouseholdInvite[]>('/household/invites');
      return data;
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (role: string = 'member') => {
      const { data } = await apiClient.post<HouseholdInvite>('/household/invites', { role });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household', 'invites'] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/household/invites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household', 'invites'] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { data } = await apiClient.patch<HouseholdMember>(`/household/members/${memberId}/role`, { role });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household', 'members'] });
    },
  });
}

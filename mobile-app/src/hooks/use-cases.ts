/**
 * React Query hooks for cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCases, getCase, createCase, updateCase, updateCaseStatus, searchCases } from '@/lib/api/cases';
import { useOrgStore } from '@/store/org';
import { useAuthStore } from '@/store/auth';
import { CreateCaseInput } from '@/lib/types/case';
import { useMockStore } from '@/store/mock';
import { mockCases } from '@/lib/mock/data';

function searchMockCases(q: string) {
  const lower = q.toLowerCase();
  return mockCases.filter(
    (c) =>
      c.case_number.toLowerCase().includes(lower) ||
      c.client_name.toLowerCase().includes(lower) ||
      (c.claim_reference?.toLowerCase().includes(lower) ?? false)
  );
}

export function useCases() {
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);
  const mockCasesOn = useMockStore((s) => s.available && s.toggles.cases);

  return useQuery({
    queryKey: ['cases', selectedOrgId, mockCasesOn],
    queryFn: () => {
      if (mockCasesOn) return Promise.resolve([...mockCases]);
      if (!selectedOrgId) throw new Error('No org selected');
      return getCases(selectedOrgId);
    },
    enabled: mockCasesOn || !!selectedOrgId,
  });
}

export function useCase(caseId: string) {
  const mockCasesOn = useMockStore((s) => s.available && s.toggles.cases);

  return useQuery({
    queryKey: ['case', caseId, mockCasesOn],
    queryFn: () => {
      if (mockCasesOn) {
        const c = mockCases.find((x) => x.id === caseId);
        if (!c) throw new Error('Not found');
        return Promise.resolve(c);
      }
      return getCase(caseId);
    },
    enabled: !!caseId,
  });
}

export function useSearchCases(query: string) {
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);
  const mockCasesOn = useMockStore((state) => state.available && state.toggles.cases);

  return useQuery({
    queryKey: ['cases', 'search', selectedOrgId, query, mockCasesOn],
    queryFn: () => {
      if (mockCasesOn) return Promise.resolve(searchMockCases(query));
      if (!selectedOrgId) throw new Error('No org selected');
      if (!query.trim()) return [];
      return searchCases(selectedOrgId, query);
    },
    enabled: !!query.trim() && (mockCasesOn || !!selectedOrgId),
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (input: CreateCaseInput) => {
      if (!selectedOrgId || !user) {
        throw new Error('Org or user not found');
      }
      return createCase({
        ...input,
        org_id: selectedOrgId,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases', selectedOrgId] });
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);

  return useMutation({
    mutationFn: ({ caseId, updates }: { caseId: string; updates: Partial<CreateCaseInput> }) =>
      updateCase(caseId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases', selectedOrgId] });
      queryClient.invalidateQueries({ queryKey: ['case', data.id] });
    },
  });
}

export function useUpdateCaseStatus() {
  const queryClient = useQueryClient();
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);

  return useMutation({
    mutationFn: ({ caseId, status }: { caseId: string; status: any }) =>
      updateCaseStatus(caseId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases', selectedOrgId] });
      queryClient.invalidateQueries({ queryKey: ['case', data.id] });
    },
  });
}

/**
 * React Query hooks for cases
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCases,
  getCase,
  createCase,
  updateCase,
  updateCaseStatus,
  updateCasePriority,
  searchCases,
} from '@/lib/api/cases'
import { CreateCaseInput, UpdateCaseInput, CaseStatus, CasePriority } from '@/lib/types/case'

export function useCases() {
  return useQuery({
    queryKey: ['cases'],
    queryFn: () => getCases(),
  })
}

export function useCase(caseId: string) {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: () => getCase(caseId),
    enabled: !!caseId,
  })
}

export function useSearchCases(query: string) {
  return useQuery({
    queryKey: ['cases', 'search', query],
    queryFn: () => searchCases(query),
    enabled: query.length > 0,
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCaseInput) => createCase(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export function useUpdateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, updates }: { caseId: string; updates: UpdateCaseInput }) =>
      updateCase(caseId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
    },
  })
}

export function useUpdateCaseStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, status }: { caseId: string; status: CaseStatus }) =>
      updateCaseStatus(caseId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
    },
  })
}

export function useUpdateCasePriority() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, priority }: { caseId: string; priority: CasePriority }) =>
      updateCasePriority(caseId, priority),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
    },
  })
}

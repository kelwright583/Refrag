/**
 * React Query hooks for case risk items
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/risk-items'
import { CreateRiskItemInput, UpdateRiskItemInput } from '@/lib/types/risk-item'

export const riskItemKeys = {
  all: ['risk-items'] as const,
  list: (caseId: string) => [...riskItemKeys.all, 'list', caseId] as const,
}

export function useRiskItems(caseId: string | null) {
  return useQuery({
    queryKey: riskItemKeys.list(caseId!),
    queryFn: () => api.getRiskItems(caseId!),
    enabled: !!caseId,
  })
}

export function useCreateRiskItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRiskItemInput) => api.createRiskItem(input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: riskItemKeys.list(variables.case_id) })
      qc.invalidateQueries({ queryKey: ['case', variables.case_id] })
    },
  })
}

export function useUpdateRiskItem(caseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ riskItemId, updates }: { riskItemId: string; updates: UpdateRiskItemInput }) =>
      api.updateRiskItem(caseId, riskItemId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: riskItemKeys.list(caseId) })
      qc.invalidateQueries({ queryKey: ['case', caseId] })
    },
  })
}

export function useDeleteRiskItem(caseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (riskItemId: string) => api.deleteRiskItem(caseId, riskItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: riskItemKeys.list(caseId) })
      qc.invalidateQueries({ queryKey: ['case', caseId] })
    },
  })
}

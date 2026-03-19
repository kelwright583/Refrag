'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/mandates'
import {
  CreateMandateInput,
  UpdateMandateInput,
  CreateRequirementInput,
  UpdateRequirementInput,
  AssignMandateInput,
  UpdateRequirementCheckInput,
} from '@/lib/types/mandate'

export const mandateKeys = {
  all: ['mandates'] as const,
  list: () => [...mandateKeys.all, 'list'] as const,
  detail: (id: string) => [...mandateKeys.all, id] as const,
  requirements: (mandateId: string) => [...mandateKeys.all, mandateId, 'requirements'] as const,
}

export function useMandates() {
  return useQuery({
    queryKey: mandateKeys.list(),
    queryFn: () => api.getMandates(),
  })
}

export function useMandate(id: string | null) {
  return useQuery({
    queryKey: mandateKeys.detail(id!),
    queryFn: () => api.getMandate(id!),
    enabled: !!id,
  })
}

export function useCreateMandate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMandateInput) => api.createMandate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: mandateKeys.all }),
  })
}

export function useUpdateMandate(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateMandateInput) => api.updateMandate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mandateKeys.all })
      qc.invalidateQueries({ queryKey: mandateKeys.detail(id) })
    },
  })
}

export function useDeleteMandate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteMandate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mandateKeys.all }),
  })
}

export function useCloneMandate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetClientId }: { id: string; targetClientId?: string | null }) =>
      api.cloneMandate(id, targetClientId),
    onSuccess: () => qc.invalidateQueries({ queryKey: mandateKeys.all }),
  })
}

export function useCreateRequirement(mandateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRequirementInput) => api.createRequirement(mandateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mandateKeys.detail(mandateId) })
    },
  })
}

export function useBulkUpdateRequirements(mandateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requirements: { id: string; order_index: number; category?: string }[]) =>
      api.bulkUpdateRequirements(mandateId, requirements),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mandateKeys.detail(mandateId) })
    },
  })
}

export function useUpdateRequirement(mandateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requirementId, data }: { requirementId: string; data: UpdateRequirementInput }) =>
      api.updateRequirement(mandateId, requirementId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mandateKeys.detail(mandateId) })
    },
  })
}

export function useDeleteRequirement(mandateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requirementId: string) => api.deleteRequirement(mandateId, requirementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mandateKeys.detail(mandateId) })
    },
  })
}

export function useCaseMandates(caseId: string) {
  return useQuery({
    queryKey: ['case-mandates', caseId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/mandates`)
      if (!res.ok) throw new Error('Failed to fetch case mandates')
      return res.json()
    },
    enabled: !!caseId,
  })
}

export function useRequirementChecks(caseId: string) {
  return useQuery({
    queryKey: ['requirement-checks', caseId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/requirement-checks`)
      if (!res.ok) throw new Error('Failed to fetch requirement checks')
      return res.json()
    },
    enabled: !!caseId,
  })
}

export function useAssignMandate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssignMandateInput) => {
      const res = await fetch(`/api/cases/${input.case_id}/mandates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandate_id: input.mandate_id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to assign mandate')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['case-mandates', variables.case_id] })
      qc.invalidateQueries({ queryKey: ['requirement-checks', variables.case_id] })
    },
  })
}

export function useUpdateRequirementCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ caseId, input }: { caseId: string; input: UpdateRequirementCheckInput }) => {
      const res = await fetch(`/api/cases/${caseId}/requirement-checks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update requirement check')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['requirement-checks', variables.caseId] })
    },
  })
}

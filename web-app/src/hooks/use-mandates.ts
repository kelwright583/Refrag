/**
 * React Query hooks for mandates
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMandates,
  getMandate,
  getMandateRequirements,
  getCaseMandates,
  getRequirementChecks,
  assignMandateToCase,
  updateRequirementCheck,
} from '@/lib/api/mandates'
import {
  AssignMandateInput,
  UpdateRequirementCheckInput,
} from '@/lib/types/mandate'

export function useMandates() {
  return useQuery({
    queryKey: ['mandates'],
    queryFn: () => getMandates(),
  })
}

export function useMandate(mandateId: string) {
  return useQuery({
    queryKey: ['mandate', mandateId],
    queryFn: () => getMandate(mandateId),
    enabled: !!mandateId,
  })
}

export function useMandateRequirements(mandateId: string) {
  return useQuery({
    queryKey: ['mandate-requirements', mandateId],
    queryFn: () => getMandateRequirements(mandateId),
    enabled: !!mandateId,
  })
}

export function useCaseMandates(caseId: string) {
  return useQuery({
    queryKey: ['case-mandates', caseId],
    queryFn: () => getCaseMandates(caseId),
    enabled: !!caseId,
  })
}

export function useRequirementChecks(caseId: string) {
  return useQuery({
    queryKey: ['requirement-checks', caseId],
    queryFn: () => getRequirementChecks(caseId),
    enabled: !!caseId,
  })
}

export function useAssignMandate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AssignMandateInput) => assignMandateToCase(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-mandates', variables.case_id] })
      queryClient.invalidateQueries({ queryKey: ['requirement-checks', variables.case_id] })
    },
  })
}

export function useUpdateRequirementCheck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      caseId,
      input,
    }: {
      caseId: string
      input: UpdateRequirementCheckInput
    }) => updateRequirementCheck(caseId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['requirement-checks', variables.caseId],
      })
    },
  })
}

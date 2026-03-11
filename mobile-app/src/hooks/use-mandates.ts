/**
 * React Query hooks for mandates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMandates,
  getMandate,
  getMandateRequirements,
  getCaseMandates,
  getRequirementChecks,
  assignMandateToCase,
  updateRequirementCheck,
  linkEvidenceToRequirement,
} from '@/lib/api/mandates';
import { useOrgStore } from '@/store/org';
import {
  AssignMandateInput,
  UpdateRequirementCheckInput,
} from '@/lib/types/mandate';

export function useMandates() {
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);

  return useQuery({
    queryKey: ['mandates', selectedOrgId],
    queryFn: () => {
      if (!selectedOrgId) throw new Error('No org selected');
      return getMandates(selectedOrgId);
    },
    enabled: !!selectedOrgId,
  });
}

export function useMandate(mandateId: string) {
  return useQuery({
    queryKey: ['mandate', mandateId],
    queryFn: () => getMandate(mandateId),
    enabled: !!mandateId,
  });
}

export function useMandateRequirements(mandateId: string) {
  return useQuery({
    queryKey: ['mandate-requirements', mandateId],
    queryFn: () => getMandateRequirements(mandateId),
    enabled: !!mandateId,
  });
}

export function useCaseMandates(caseId: string) {
  return useQuery({
    queryKey: ['case-mandates', caseId],
    queryFn: () => getCaseMandates(caseId),
    enabled: !!caseId,
  });
}

export function useRequirementChecks(caseId: string) {
  return useQuery({
    queryKey: ['requirement-checks', caseId],
    queryFn: () => getRequirementChecks(caseId),
    enabled: !!caseId,
  });
}

export function useAssignMandate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignMandateInput) => assignMandateToCase(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['case-mandates', variables.case_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['requirement-checks', variables.case_id],
      });
    },
  });
}

export function useUpdateRequirementCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateRequirementCheckInput) =>
      updateRequirementCheck(input),
    onSuccess: (_, variables) => {
      // We need to get the case_id from the requirement check
      // For now, invalidate all requirement checks queries
      queryClient.invalidateQueries({
        queryKey: ['requirement-checks'],
      });
    },
  });
}

export function useLinkEvidenceToRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requirementCheckId,
      evidenceId,
    }: {
      requirementCheckId: string;
      evidenceId: string;
    }) => linkEvidenceToRequirement(requirementCheckId, evidenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['requirement-checks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['evidence'],
      });
    },
  });
}

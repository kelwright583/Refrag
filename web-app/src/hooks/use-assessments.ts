'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAssessmentsForCase,
  getAssessment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  upsertVehicleDetails,
  upsertTyreDetails,
  createPreExistingDamage,
  deletePreExistingDamage,
  upsertVehicleValues,
  upsertRepairAssessment,
  createRepairLineItem,
  updateRepairLineItem,
  deleteRepairLineItem,
  upsertPartsAssessment,
  upsertClaimFinancials,
  createReportEvidenceLink,
  deleteReportEvidenceLink,
  getAssessmentSettings,
  updateAssessmentSettings,
  getApprovedRepairers,
  createApprovedRepairer,
  deleteApprovedRepairer,
  getPreferredSuppliers,
  createPreferredSupplier,
  deletePreferredSupplier,
} from '@/lib/api/assessments'
import type {
  CreateMotorAssessmentInput,
  UpdateMotorAssessmentInput,
  UpsertVehicleDetailsInput,
  UpsertTyreDetailInput,
  CreatePreExistingDamageInput,
  UpsertVehicleValuesInput,
  UpsertRepairAssessmentInput,
  CreateRepairLineItemInput,
  UpdateRepairLineItemInput,
  UpsertPartsAssessmentInput,
  UpsertClaimFinancialsInput,
  CreateReportEvidenceLinkInput,
  UpdateAssessmentSettingsInput,
} from '@/lib/types/assessment'

// ============================================================================
// Motor Assessments
// ============================================================================

export function useAssessmentsForCase(caseId: string) {
  return useQuery({
    queryKey: ['assessments', 'case', caseId],
    queryFn: () => getAssessmentsForCase(caseId),
    enabled: !!caseId,
  })
}

export function useAssessment(assessmentId: string) {
  return useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => getAssessment(assessmentId),
    enabled: !!assessmentId,
  })
}

export function useCreateAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMotorAssessmentInput) => createAssessment(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assessments', 'case', data.case_id] })
    },
  })
}

export function useUpdateAssessment(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMotorAssessmentInput) => updateAssessment(assessmentId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
      queryClient.invalidateQueries({ queryKey: ['assessments', 'case', data.case_id] })
    },
  })
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ assessmentId, caseId }: { assessmentId: string; caseId: string }) =>
      deleteAssessment(assessmentId),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['assessments', 'case', caseId] })
    },
  })
}

// ============================================================================
// Vehicle Details
// ============================================================================

export function useUpsertVehicleDetails(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertVehicleDetailsInput) => upsertVehicleDetails(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

// ============================================================================
// Tyre Details
// ============================================================================

export function useUpsertTyreDetails(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertTyreDetailInput[]) => upsertTyreDetails(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

// ============================================================================
// Pre-existing Damages
// ============================================================================

export function useCreatePreExistingDamage(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePreExistingDamageInput) => createPreExistingDamage(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

export function useDeletePreExistingDamage(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (damageId: string) => deletePreExistingDamage(assessmentId, damageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

// ============================================================================
// Vehicle Values
// ============================================================================

export function useUpsertVehicleValues(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertVehicleValuesInput) => upsertVehicleValues(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

// ============================================================================
// Repair Assessment + Line Items
// ============================================================================

export function useUpsertRepairAssessment(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertRepairAssessmentInput) => upsertRepairAssessment(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

export function useCreateRepairLineItem(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRepairLineItemInput) => createRepairLineItem(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

export function useUpdateRepairLineItem(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lineItemId, input }: { lineItemId: string; input: UpdateRepairLineItemInput }) =>
      updateRepairLineItem(assessmentId, lineItemId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

export function useDeleteRepairLineItem(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lineItemId: string) => deleteRepairLineItem(assessmentId, lineItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

// ============================================================================
// Parts Assessment
// ============================================================================

export function useUpsertPartsAssessment(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertPartsAssessmentInput) => upsertPartsAssessment(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

// ============================================================================
// Claim Financials
// ============================================================================

export function useUpsertClaimFinancials(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertClaimFinancialsInput) => upsertClaimFinancials(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

// ============================================================================
// Report Evidence Links
// ============================================================================

export function useCreateReportEvidenceLink(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateReportEvidenceLinkInput) => createReportEvidenceLink(assessmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

export function useDeleteReportEvidenceLink(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => deleteReportEvidenceLink(assessmentId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

// ============================================================================
// Assessment Settings
// ============================================================================

export function useAssessmentSettings() {
  return useQuery({
    queryKey: ['assessment-settings'],
    queryFn: () => getAssessmentSettings(),
  })
}

export function useUpdateAssessmentSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAssessmentSettingsInput) => updateAssessmentSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-settings'] })
    },
  })
}

// ============================================================================
// Approved Repairers
// ============================================================================

export function useApprovedRepairers() {
  return useQuery({
    queryKey: ['approved-repairers'],
    queryFn: () => getApprovedRepairers(),
  })
}

export function useCreateApprovedRepairer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; contact_number?: string; email?: string; address?: string }) =>
      createApprovedRepairer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-repairers'] })
    },
  })
}

export function useDeleteApprovedRepairer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (repairerId: string) => deleteApprovedRepairer(repairerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-repairers'] })
    },
  })
}

// ============================================================================
// Preferred Parts Suppliers
// ============================================================================

export function usePreferredSuppliers() {
  return useQuery({
    queryKey: ['preferred-suppliers'],
    queryFn: () => getPreferredSuppliers(),
  })
}

export function useCreatePreferredSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; contact_number?: string; email?: string; notes?: string }) =>
      createPreferredSupplier(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferred-suppliers'] })
    },
  })
}

export function useDeletePreferredSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (supplierId: string) => deletePreferredSupplier(supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferred-suppliers'] })
    },
  })
}

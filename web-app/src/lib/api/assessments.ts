import type {
  MotorAssessment,
  FullMotorAssessment,
  CreateMotorAssessmentInput,
  UpdateMotorAssessmentInput,
  VehicleDetails,
  UpsertVehicleDetailsInput,
  UpsertTyreDetailInput,
  TyreDetail,
  PreExistingDamage,
  CreatePreExistingDamageInput,
  VehicleValues,
  UpsertVehicleValuesInput,
  RepairAssessment,
  UpsertRepairAssessmentInput,
  RepairLineItem,
  CreateRepairLineItemInput,
  UpdateRepairLineItemInput,
  PartsAssessment,
  UpsertPartsAssessmentInput,
  ClaimFinancials,
  UpsertClaimFinancialsInput,
  ReportEvidenceLink,
  CreateReportEvidenceLinkInput,
  AssessmentSettings,
  UpdateAssessmentSettingsInput,
  ApprovedRepairer,
  PreferredPartsSupplier,
} from '@/lib/types/assessment'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `Request failed: ${response.status}`)
  }
  return response.json()
}

// ============================================================================
// Motor Assessments
// ============================================================================

export async function getAssessmentsForCase(caseId: string): Promise<MotorAssessment[]> {
  return apiFetch(`/api/assessments?caseId=${caseId}`)
}

export async function getAssessment(assessmentId: string): Promise<FullMotorAssessment> {
  return apiFetch(`/api/assessments/${assessmentId}`)
}

export async function createAssessment(input: CreateMotorAssessmentInput): Promise<MotorAssessment> {
  return apiFetch('/api/assessments', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateAssessment(assessmentId: string, input: UpdateMotorAssessmentInput): Promise<MotorAssessment> {
  return apiFetch(`/api/assessments/${assessmentId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function deleteAssessment(assessmentId: string): Promise<void> {
  await fetch(`/api/assessments/${assessmentId}`, { method: 'DELETE' })
}

// ============================================================================
// Vehicle Details
// ============================================================================

export async function upsertVehicleDetails(assessmentId: string, input: UpsertVehicleDetailsInput): Promise<VehicleDetails> {
  return apiFetch(`/api/assessments/${assessmentId}/vehicle`, { method: 'PUT', body: JSON.stringify(input) })
}

// ============================================================================
// Tyre Details
// ============================================================================

export async function upsertTyreDetails(assessmentId: string, input: UpsertTyreDetailInput[]): Promise<TyreDetail[]> {
  return apiFetch(`/api/assessments/${assessmentId}/tyres`, { method: 'PUT', body: JSON.stringify(input) })
}

// ============================================================================
// Pre-existing Damages
// ============================================================================

export async function createPreExistingDamage(assessmentId: string, input: CreatePreExistingDamageInput): Promise<PreExistingDamage> {
  return apiFetch(`/api/assessments/${assessmentId}/damages`, { method: 'POST', body: JSON.stringify(input) })
}

export async function deletePreExistingDamage(assessmentId: string, damageId: string): Promise<void> {
  await fetch(`/api/assessments/${assessmentId}/damages/${damageId}`, { method: 'DELETE' })
}

// ============================================================================
// Vehicle Values
// ============================================================================

export async function upsertVehicleValues(assessmentId: string, input: UpsertVehicleValuesInput): Promise<VehicleValues> {
  return apiFetch(`/api/assessments/${assessmentId}/values`, { method: 'PUT', body: JSON.stringify(input) })
}

// ============================================================================
// Repair Assessment + Line Items
// ============================================================================

export async function upsertRepairAssessment(assessmentId: string, input: UpsertRepairAssessmentInput): Promise<RepairAssessment> {
  return apiFetch(`/api/assessments/${assessmentId}/repair`, { method: 'PUT', body: JSON.stringify(input) })
}

export async function createRepairLineItem(assessmentId: string, input: CreateRepairLineItemInput): Promise<RepairLineItem> {
  return apiFetch(`/api/assessments/${assessmentId}/repair/line-items`, { method: 'POST', body: JSON.stringify(input) })
}

export async function updateRepairLineItem(assessmentId: string, lineItemId: string, input: UpdateRepairLineItemInput): Promise<RepairLineItem> {
  return apiFetch(`/api/assessments/${assessmentId}/repair/line-items/${lineItemId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function deleteRepairLineItem(assessmentId: string, lineItemId: string): Promise<void> {
  await fetch(`/api/assessments/${assessmentId}/repair/line-items/${lineItemId}`, { method: 'DELETE' })
}

// ============================================================================
// Parts Assessment
// ============================================================================

export async function upsertPartsAssessment(assessmentId: string, input: UpsertPartsAssessmentInput): Promise<PartsAssessment> {
  return apiFetch(`/api/assessments/${assessmentId}/parts`, { method: 'PUT', body: JSON.stringify(input) })
}

// ============================================================================
// Claim Financials
// ============================================================================

export async function upsertClaimFinancials(assessmentId: string, input: UpsertClaimFinancialsInput): Promise<ClaimFinancials> {
  return apiFetch(`/api/assessments/${assessmentId}/financials`, { method: 'PUT', body: JSON.stringify(input) })
}

// ============================================================================
// Report Evidence Links
// ============================================================================

export async function getReportEvidenceLinks(assessmentId: string): Promise<ReportEvidenceLink[]> {
  return apiFetch(`/api/assessments/${assessmentId}/evidence-links`)
}

export async function createReportEvidenceLink(assessmentId: string, input: CreateReportEvidenceLinkInput): Promise<ReportEvidenceLink> {
  return apiFetch(`/api/assessments/${assessmentId}/evidence-links`, { method: 'POST', body: JSON.stringify(input) })
}

export async function deleteReportEvidenceLink(assessmentId: string, linkId: string): Promise<void> {
  await fetch(`/api/assessments/${assessmentId}/evidence-links/${linkId}`, { method: 'DELETE' })
}

// ============================================================================
// Assessment Settings
// ============================================================================

export async function getAssessmentSettings(): Promise<AssessmentSettings | null> {
  return apiFetch('/api/settings/assessment')
}

export async function updateAssessmentSettings(input: UpdateAssessmentSettingsInput): Promise<AssessmentSettings> {
  return apiFetch('/api/settings/assessment', { method: 'PUT', body: JSON.stringify(input) })
}

// ============================================================================
// Approved Repairers
// ============================================================================

export async function getApprovedRepairers(): Promise<ApprovedRepairer[]> {
  return apiFetch('/api/settings/assessment/repairers')
}

export async function createApprovedRepairer(input: { name: string; contact_number?: string; email?: string; address?: string }): Promise<ApprovedRepairer> {
  return apiFetch('/api/settings/assessment/repairers', { method: 'POST', body: JSON.stringify(input) })
}

export async function deleteApprovedRepairer(repairerId: string): Promise<void> {
  await fetch(`/api/settings/assessment/repairers/${repairerId}`, { method: 'DELETE' })
}

// ============================================================================
// Preferred Parts Suppliers
// ============================================================================

export async function getPreferredSuppliers(): Promise<PreferredPartsSupplier[]> {
  return apiFetch('/api/settings/assessment/suppliers')
}

export async function createPreferredSupplier(input: { name: string; contact_number?: string; email?: string; notes?: string }): Promise<PreferredPartsSupplier> {
  return apiFetch('/api/settings/assessment/suppliers', { method: 'POST', body: JSON.stringify(input) })
}

export async function deletePreferredSupplier(supplierId: string): Promise<void> {
  await fetch(`/api/settings/assessment/suppliers/${supplierId}`, { method: 'DELETE' })
}

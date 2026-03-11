/**
 * Cases API functions (admin)
 */

import { CaseRiskItem } from '@/lib/types/risk-item'

export interface Case {
  id: string
  org_id: string
  case_number: string
  client_name: string
  insurer_name?: string
  broker_name?: string
  claim_reference?: string
  insurer_reference?: string
  loss_date?: string
  location?: string
  status: string
  priority?: string
  primary_risk_item_id?: string | null
  repair_estimate_amount?: number | null
  write_off_status?: string | null
  created_at: string
  org?: {
    name: string
  }
}

/**
 * Search cases (admin)
 */
export async function searchCases(query: string): Promise<Case[]> {
  const response = await fetch(`/api/admin/cases/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to search cases')
  }

  return response.json()
}

/**
 * Get case by ID (admin)
 */
export async function getCase(caseId: string): Promise<Case> {
  const response = await fetch(`/api/admin/cases/${caseId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch case')
  }

  return response.json()
}

/**
 * Get case evidence (admin)
 */
export async function getCaseEvidence(caseId: string): Promise<any[]> {
  const response = await fetch(`/api/admin/cases/${caseId}/evidence`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch evidence')
  }

  return response.json()
}

/**
 * Get case risk items (admin)
 */
export async function getCaseRiskItems(caseId: string): Promise<CaseRiskItem[]> {
  const response = await fetch(`/api/admin/cases/${caseId}/risk-items`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch risk items')
  }

  return response.json()
}

/**
 * Get evidence signed URL (admin)
 */
export async function getEvidenceSignedUrl(evidenceId: string, caseId: string): Promise<string> {
  const response = await fetch(
    `/api/admin/cases/${caseId}/evidence/${evidenceId}/signed-url`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get signed URL')
  }

  const data = await response.json()
  return data.url
}

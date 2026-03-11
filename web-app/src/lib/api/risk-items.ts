/**
 * Risk item API functions (client-side)
 */

import { CaseRiskItem, CreateRiskItemInput, UpdateRiskItemInput } from '@/lib/types/risk-item'

export async function getRiskItems(caseId: string): Promise<CaseRiskItem[]> {
  const res = await fetch(`/api/cases/${caseId}/risk-items`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch risk items')
  }
  return res.json()
}

export async function createRiskItem(input: CreateRiskItemInput): Promise<CaseRiskItem> {
  const res = await fetch(`/api/cases/${input.case_id}/risk-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create risk item')
  }
  return res.json()
}

export async function updateRiskItem(
  caseId: string,
  riskItemId: string,
  updates: UpdateRiskItemInput
): Promise<CaseRiskItem> {
  const res = await fetch(`/api/cases/${caseId}/risk-items/${riskItemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update risk item')
  }
  return res.json()
}

export async function deleteRiskItem(caseId: string, riskItemId: string): Promise<void> {
  const res = await fetch(`/api/cases/${caseId}/risk-items/${riskItemId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete risk item')
  }
}

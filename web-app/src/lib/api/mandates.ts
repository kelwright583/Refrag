/**
 * Mandate API functions (client-side)
 */

import {
  Mandate,
  MandateRequirement,
  CaseMandateWithDetails,
  RequirementCheckWithDetails,
  CreateMandateInput,
  CreateMandateRequirementInput,
  AssignMandateInput,
  UpdateRequirementCheckInput,
} from '@/lib/types/mandate'

export async function getMandates(): Promise<Mandate[]> {
  const response = await fetch('/api/mandates', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch mandates')
  }

  return response.json()
}

export async function getMandate(mandateId: string): Promise<Mandate> {
  const response = await fetch(`/api/mandates/${mandateId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch mandate')
  }

  return response.json()
}

export async function getMandateRequirements(
  mandateId: string
): Promise<MandateRequirement[]> {
  const response = await fetch(`/api/mandates/${mandateId}/requirements`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch requirements')
  }

  return response.json()
}

export async function getCaseMandates(caseId: string): Promise<CaseMandateWithDetails[]> {
  const response = await fetch(`/api/cases/${caseId}/mandates`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch case mandates')
  }

  return response.json()
}

export async function getRequirementChecks(
  caseId: string
): Promise<RequirementCheckWithDetails[]> {
  const response = await fetch(`/api/cases/${caseId}/requirement-checks`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch requirement checks')
  }

  return response.json()
}

export async function assignMandateToCase(input: AssignMandateInput): Promise<void> {
  const response = await fetch(`/api/cases/${input.case_id}/mandates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mandate_id: input.mandate_id }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to assign mandate')
  }
}

export async function updateRequirementCheck(
  caseId: string,
  input: UpdateRequirementCheckInput
): Promise<void> {
  const response = await fetch(`/api/cases/${caseId}/requirement-checks`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update requirement check')
  }
}

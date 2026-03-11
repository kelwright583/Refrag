/**
 * Case API functions (client-side)
 */

import { Case, CreateCaseInput, UpdateCaseInput, CaseStatus, CasePriority } from '@/lib/types/case'
import { NotificationPrompt } from '@/lib/types/notification-rule'

export interface StatusChangeResult extends Case {
  notification_prompt?: NotificationPrompt | null
}

/**
 * Get all cases for the user's organization
 */
export async function getCases(): Promise<Case[]> {
  const response = await fetch('/api/cases', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch cases')
  }

  return response.json()
}

/**
 * Get case by ID
 */
export async function getCase(caseId: string): Promise<Case | null> {
  const response = await fetch(`/api/cases/${caseId}`, {
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
 * Create a new case
 */
export async function createCase(input: CreateCaseInput): Promise<Case> {
  const response = await fetch('/api/cases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create case')
  }

  return response.json()
}

/**
 * Update a case
 */
export async function updateCase(
  caseId: string,
  updates: UpdateCaseInput
): Promise<Case> {
  const response = await fetch(`/api/cases/${caseId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update case')
  }

  return response.json()
}

/**
 * Update case status
 */
export async function updateCaseStatus(
  caseId: string,
  status: CaseStatus
): Promise<StatusChangeResult> {
  const response = await fetch(`/api/cases/${caseId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update case status')
  }

  return response.json()
}

/**
 * Update case priority
 */
export async function updateCasePriority(
  caseId: string,
  priority: CasePriority
): Promise<Case> {
  const response = await fetch(`/api/cases/${caseId}/priority`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priority }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update case priority')
  }

  return response.json()
}

/**
 * Search cases
 */
export async function searchCases(query: string): Promise<Case[]> {
  const response = await fetch(`/api/cases/search?q=${encodeURIComponent(query)}`, {
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

/**
 * Organisation API functions (admin)
 */

import { Organisation, OrganisationWithStats, UpdateOrganisationInput } from '@/lib/types/admin'

/**
 * Get all organisations
 */
export async function getOrganisations(filters?: {
  status?: string
  search?: string
}): Promise<OrganisationWithStats[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.search) params.append('search', filters.search)

  const response = await fetch(`/api/admin/orgs?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch organisations')
  }

  return response.json()
}

/**
 * Get organisation by ID
 */
export async function getOrganisation(orgId: string): Promise<OrganisationWithStats> {
  const response = await fetch(`/api/admin/orgs/${orgId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch organisation')
  }

  return response.json()
}

/**
 * Update organisation
 */
export async function updateOrganisation(
  orgId: string,
  updates: UpdateOrganisationInput
): Promise<Organisation> {
  const response = await fetch(`/api/admin/orgs/${orgId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update organisation')
  }

  return response.json()
}

/**
 * Get organisation members
 */
export async function getOrgMembers(orgId: string): Promise<any[]> {
  const response = await fetch(`/api/admin/orgs/${orgId}/members`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch members')
  }

  return response.json()
}

/**
 * Get organisation activity
 */
export async function getOrgActivity(orgId: string): Promise<any[]> {
  const response = await fetch(`/api/admin/orgs/${orgId}/activity`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch activity')
  }

  return response.json()
}

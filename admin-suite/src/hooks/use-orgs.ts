/**
 * React Query hooks for organisations (admin)
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOrganisations,
  getOrganisation,
  updateOrganisation,
  getOrgMembers,
  getOrgActivity,
} from '@/lib/api/orgs'
import { UpdateOrganisationInput } from '@/lib/types/admin'

export function useOrganisations(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['organisations', filters],
    queryFn: () => getOrganisations(filters),
  })
}

export function useOrganisation(orgId: string) {
  return useQuery({
    queryKey: ['organisation', orgId],
    queryFn: () => getOrganisation(orgId),
    enabled: !!orgId,
  })
}

export function useUpdateOrganisation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, updates }: { orgId: string; updates: UpdateOrganisationInput }) =>
      updateOrganisation(orgId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
      queryClient.invalidateQueries({ queryKey: ['organisation', data.id] })
    },
  })
}

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () => getOrgMembers(orgId),
    enabled: !!orgId,
  })
}

export function useOrgActivity(orgId: string) {
  return useQuery({
    queryKey: ['org-activity', orgId],
    queryFn: () => getOrgActivity(orgId),
    enabled: !!orgId,
  })
}

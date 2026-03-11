/**
 * React Query hooks for clients
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/clients'
import { CreateClientInput, UpdateClientInput } from '@/lib/types/client'

export const clientsKeys = {
  all: ['clients'] as const,
  list: () => [...clientsKeys.all, 'list'] as const,
  detail: (id: string) => [...clientsKeys.all, id] as const,
}

export function useClients() {
  return useQuery({
    queryKey: clientsKeys.list(),
    queryFn: () => api.getClients(),
  })
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: clientsKeys.detail(id!),
    queryFn: () => api.getClient(id!),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClientInput) => api.createClient(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKeys.all }),
  })
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateClientInput) => api.updateClient(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKeys.all }),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKeys.all }),
  })
}

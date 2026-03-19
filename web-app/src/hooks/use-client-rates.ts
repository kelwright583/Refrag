'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/client-rates'
import { CreateClientRateInput, UpdateClientRateInput } from '@/lib/types/client-rate'

export const clientRatesKeys = {
  all: ['client-rates'] as const,
  list: (clientId: string) => [...clientRatesKeys.all, 'list', clientId] as const,
}

export function useClientRates(clientId: string | null) {
  return useQuery({
    queryKey: clientRatesKeys.list(clientId!),
    queryFn: () => api.getClientRates(clientId!),
    enabled: !!clientId,
  })
}

export function useCreateClientRate(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClientRateInput) => api.createClientRate(clientId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientRatesKeys.list(clientId) })
    },
  })
}

export function useUpdateClientRate(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rateId, data }: { rateId: string; data: UpdateClientRateInput }) =>
      api.updateClientRate(clientId, rateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientRatesKeys.list(clientId) })
    },
  })
}

export function useDeleteClientRate(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rateId: string) => api.deleteClientRate(clientId, rateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientRatesKeys.list(clientId) })
    },
  })
}

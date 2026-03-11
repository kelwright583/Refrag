/**
 * React Query hooks for client rules
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/client-rules'
import { CreateClientRuleInput } from '@/lib/types/client-rule'

export const clientRulesKeys = {
  all: ['client-rules'] as const,
  list: (clientId: string) => [...clientRulesKeys.all, 'list', clientId] as const,
}

export function useClientRules(clientId: string | null) {
  return useQuery({
    queryKey: clientRulesKeys.list(clientId!),
    queryFn: () => api.getClientRules(clientId!),
    enabled: !!clientId,
  })
}

export function useUpsertClientRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClientRuleInput) => api.upsertClientRule(input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: clientRulesKeys.list(variables.client_id) })
    },
  })
}

export function useDeleteClientRule(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleKey: string) => api.deleteClientRule(clientId, ruleKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientRulesKeys.list(clientId) })
    },
  })
}

/**
 * React Query hooks for notification rules
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/notification-rules'
import { UpsertNotificationRuleInput } from '@/lib/types/notification-rule'

export const notifRulesKeys = {
  all: ['notification-rules'] as const,
  list: () => [...notifRulesKeys.all, 'list'] as const,
}

export function useNotificationRules() {
  return useQuery({
    queryKey: notifRulesKeys.list(),
    queryFn: () => api.getNotificationRules(),
  })
}

export function useUpsertNotificationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertNotificationRuleInput) => api.upsertNotificationRule(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifRulesKeys.all })
    },
  })
}

export function useDeleteNotificationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => api.deleteNotificationRule(ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifRulesKeys.all })
    },
  })
}

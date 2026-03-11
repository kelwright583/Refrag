/**
 * React Query hooks for AI operations
 */

'use client'

import { useMutation } from '@tanstack/react-query'
import * as aiApi from '@/lib/api/ai'

export function useClassifyEvidence() {
  return useMutation({
    mutationFn: (input: { evidence_id?: string; case_id?: string; image_url: string }) =>
      aiApi.classifyEvidence(input),
  })
}

export function useAssessDamage() {
  return useMutation({
    mutationFn: (input: { evidence_id?: string; case_id?: string; image_url: string }) =>
      aiApi.assessDamageSeverity(input),
  })
}

export function useCheckReport() {
  return useMutation({
    mutationFn: (input: {
      case_id?: string
      report_text: string
      report_type?: 'motor' | 'property' | 'general'
      known_pii?: Record<string, string>
    }) => aiApi.checkReport(input),
  })
}

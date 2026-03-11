/**
 * React Query hooks for cases (admin)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import {
  searchCases,
  getCase,
  getCaseEvidence,
  getEvidenceSignedUrl,
  getCaseRiskItems,
} from '@/lib/api/cases'

export function useSearchCases(query: string) {
  return useQuery({
    queryKey: ['admin-cases-search', query],
    queryFn: () => searchCases(query),
    enabled: query.length > 0,
  })
}

export function useCase(caseId: string) {
  return useQuery({
    queryKey: ['admin-case', caseId],
    queryFn: () => getCase(caseId),
    enabled: !!caseId,
  })
}

export function useCaseEvidence(caseId: string) {
  return useQuery({
    queryKey: ['admin-case-evidence', caseId],
    queryFn: () => getCaseEvidence(caseId),
    enabled: !!caseId,
  })
}

export function useCaseRiskItems(caseId: string) {
  return useQuery({
    queryKey: ['admin-case-risk-items', caseId],
    queryFn: () => getCaseRiskItems(caseId),
    enabled: !!caseId,
  })
}

export function useEvidenceSignedUrl(evidenceId: string, caseId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin-evidence-signed-url', evidenceId, caseId],
    queryFn: () => getEvidenceSignedUrl(evidenceId, caseId),
    enabled: enabled && !!evidenceId && !!caseId,
    staleTime: 1000 * 60 * 55, // 55 minutes
  })
}

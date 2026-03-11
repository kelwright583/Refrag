/**
 * React Query hooks for evidence
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEvidence,
  uploadEvidence,
  updateEvidence,
  deleteEvidence,
} from '@/lib/api/evidence'
import { UpdateEvidenceInput } from '@/lib/types/evidence'

export function useEvidence(caseId: string) {
  return useQuery({
    queryKey: ['evidence', caseId],
    queryFn: () => getEvidence(caseId),
    enabled: !!caseId,
  })
}

export function useUploadEvidence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      caseId,
      file,
      mediaType,
      options,
    }: {
      caseId: string
      file: File
      mediaType: 'photo' | 'video' | 'document'
      options?: {
        notes?: string
        tags?: string[]
        capturedAt?: string
      }
    }) => uploadEvidence(caseId, file, mediaType, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.caseId] })
    },
  })
}

export function useUpdateEvidence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      caseId,
      evidenceId,
      updates,
    }: {
      caseId: string
      evidenceId: string
      updates: UpdateEvidenceInput
    }) => updateEvidence(caseId, evidenceId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.caseId] })
    },
  })
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, evidenceId }: { caseId: string; evidenceId: string }) =>
      deleteEvidence(caseId, evidenceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.caseId] })
    },
  })
}

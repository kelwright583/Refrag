'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface CaseNote {
  id: string
  case_id: string
  org_id: string
  created_by: string
  note_type: string
  content: unknown
  created_at: string
  updated_at: string
}

async function getCaseNotes(caseId: string, noteType?: string): Promise<CaseNote[]> {
  const url = noteType
    ? `/api/cases/${caseId}/notes?type=${encodeURIComponent(noteType)}`
    : `/api/cases/${caseId}/notes`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch notes' }))
    throw new Error(err.error || 'Failed to fetch notes')
  }
  return res.json()
}

async function upsertCaseNote(
  caseId: string,
  noteType: string,
  content: unknown
): Promise<CaseNote> {
  const res = await fetch(`/api/cases/${caseId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note_type: noteType, content }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save note' }))
    throw new Error(err.error || 'Failed to save note')
  }
  return res.json()
}

export function useCaseNotes(caseId: string, noteType?: string) {
  return useQuery({
    queryKey: ['case-notes', caseId, noteType ?? '__all__'],
    queryFn: () => getCaseNotes(caseId, noteType),
    enabled: !!caseId,
  })
}

export function useUpsertCaseNote(caseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ noteType, content }: { noteType: string; content: unknown }) =>
      upsertCaseNote(caseId, noteType, content),
    onSuccess: (_, { noteType }) => {
      queryClient.invalidateQueries({ queryKey: ['case-notes', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case-notes', caseId, noteType] })
    },
  })
}

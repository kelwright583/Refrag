/**
 * React Query hooks for case contacts
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCaseContacts,
  createContact,
  updateContact,
  deleteContact,
} from '@/lib/api/contacts'
import { CreateContactInput, UpdateContactInput } from '@/lib/types/contact'

export function useCaseContacts(caseId: string) {
  return useQuery({
    queryKey: ['contacts', caseId],
    queryFn: () => getCaseContacts(caseId),
    enabled: !!caseId,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateContactInput) => createContact(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.case_id] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      contactId,
      caseId,
      updates,
    }: {
      contactId: string
      caseId: string
      updates: UpdateContactInput
    }) => updateContact(contactId, caseId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.caseId] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, caseId }: { contactId: string; caseId: string }) =>
      deleteContact(contactId, caseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.caseId] })
    },
  })
}

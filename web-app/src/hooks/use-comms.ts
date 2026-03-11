/**
 * React Query hooks for communications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCommsTemplates,
  getCommsTemplate,
  createCommsTemplate,
  updateCommsTemplate,
  deleteCommsTemplate,
  getCommsLog,
  createCommsLogEntry,
} from '@/lib/api/comms'
import {
  CreateCommsTemplateInput,
  UpdateCommsTemplateInput,
  CreateCommsLogInput,
} from '@/lib/types/comms'

/**
 * Get all comms templates
 */
export function useCommsTemplates() {
  return useQuery({
    queryKey: ['comms-templates'],
    queryFn: () => getCommsTemplates(),
  })
}

/**
 * Get a single template
 */
export function useCommsTemplate(templateId: string) {
  return useQuery({
    queryKey: ['comms-template', templateId],
    queryFn: () => getCommsTemplate(templateId),
    enabled: !!templateId,
  })
}

/**
 * Create a new template
 */
export function useCreateCommsTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCommsTemplateInput) => createCommsTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-templates'] })
    },
  })
}

/**
 * Update a template
 */
export function useUpdateCommsTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      updates,
    }: {
      templateId: string
      updates: UpdateCommsTemplateInput
    }) => updateCommsTemplate(templateId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comms-templates'] })
      queryClient.invalidateQueries({ queryKey: ['comms-template', data.id] })
    },
  })
}

/**
 * Delete a template
 */
export function useDeleteCommsTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deleteCommsTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-templates'] })
    },
  })
}

/**
 * Get comms log for a case
 */
export function useCommsLog(caseId: string) {
  return useQuery({
    queryKey: ['comms-log', caseId],
    queryFn: () => getCommsLog(caseId),
    enabled: !!caseId,
  })
}

/**
 * Create a comms log entry
 */
export function useCreateCommsLogEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      caseId,
      input,
    }: {
      caseId: string
      input: CreateCommsLogInput
    }) => createCommsLogEntry(caseId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comms-log', variables.caseId] })
    },
  })
}

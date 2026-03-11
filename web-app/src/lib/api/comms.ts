/**
 * Communications API functions (client-side)
 */

import {
  CommsTemplate,
  CommsLogEntryWithUser,
  CreateCommsTemplateInput,
  UpdateCommsTemplateInput,
  CreateCommsLogInput,
  TemplatePlaceholders,
} from '@/lib/types/comms'

/**
 * Get all comms templates
 */
export async function getCommsTemplates(): Promise<CommsTemplate[]> {
  const response = await fetch('/api/comms-templates', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch templates')
  }

  return response.json()
}

/**
 * Get template by ID
 */
export async function getCommsTemplate(templateId: string): Promise<CommsTemplate> {
  const response = await fetch(`/api/comms-templates/${templateId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch template')
  }

  return response.json()
}

/**
 * Create a new template
 */
export async function createCommsTemplate(
  input: CreateCommsTemplateInput
): Promise<CommsTemplate> {
  const response = await fetch('/api/comms-templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create template')
  }

  return response.json()
}

/**
 * Update a template
 */
export async function updateCommsTemplate(
  templateId: string,
  updates: UpdateCommsTemplateInput
): Promise<CommsTemplate> {
  const response = await fetch(`/api/comms-templates/${templateId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update template')
  }

  return response.json()
}

/**
 * Delete a template
 */
export async function deleteCommsTemplate(templateId: string): Promise<void> {
  const response = await fetch(`/api/comms-templates/${templateId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete template')
  }
}

/**
 * Get comms log for a case
 */
export async function getCommsLog(caseId: string): Promise<CommsLogEntryWithUser[]> {
  const response = await fetch(`/api/cases/${caseId}/comms`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch comms log')
  }

  return response.json()
}

/**
 * Create a comms log entry
 */
export async function createCommsLogEntry(
  caseId: string,
  input: CreateCommsLogInput
): Promise<CommsLogEntryWithUser> {
  const response = await fetch(`/api/cases/${caseId}/comms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create comms log entry')
  }

  return response.json()
}

/**
 * Replace placeholders in template text
 */
export function replaceTemplatePlaceholders(
  text: string,
  placeholders: Partial<TemplatePlaceholders>
): string {
  let result = text
  const placeholderMap: Record<string, string> = {
    '{{CaseNumber}}': placeholders.CaseNumber || '',
    '{{ClientName}}': placeholders.ClientName || '',
    '{{InsurerName}}': placeholders.InsurerName || '',
    '{{BrokerName}}': placeholders.BrokerName || '',
    '{{ClaimReference}}': placeholders.ClaimReference || '',
    '{{LossDate}}': placeholders.LossDate || '',
    '{{Location}}': placeholders.Location || '',
  }

  for (const [placeholder, value] of Object.entries(placeholderMap)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value)
  }

  return result
}

/**
 * Case contacts API functions (client-side)
 */

import { CaseContact, CreateContactInput, UpdateContactInput } from '@/lib/types/contact'

/**
 * Get contacts for a case
 */
export async function getCaseContacts(caseId: string): Promise<CaseContact[]> {
  const response = await fetch(`/api/contacts/${caseId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch contacts')
  }

  return response.json()
}

/**
 * Create a contact
 */
export async function createContact(input: CreateContactInput): Promise<CaseContact> {
  const response = await fetch(`/api/contacts/${input.case_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: input.type,
      name: input.name,
      email: input.email,
      phone: input.phone,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create contact')
  }

  return response.json()
}

/**
 * Update a contact
 */
export async function updateContact(
  contactId: string,
  caseId: string,
  updates: UpdateContactInput
): Promise<CaseContact> {
  const response = await fetch(`/api/contacts/${caseId}/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update contact')
  }

  return response.json()
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string, caseId: string): Promise<void> {
  const response = await fetch(`/api/contacts/${caseId}/${contactId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete contact')
  }
}

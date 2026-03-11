/**
 * Evidence API functions (client-side)
 */

import { EvidenceWithTags, CreateEvidenceInput, UpdateEvidenceInput } from '@/lib/types/evidence'

/**
 * Get evidence for a case
 */
export async function getEvidence(caseId: string): Promise<EvidenceWithTags[]> {
  const response = await fetch(`/api/evidence/${caseId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch evidence')
  }

  return response.json()
}

/**
 * Upload file and create evidence
 */
export async function uploadEvidence(
  caseId: string,
  file: File,
  mediaType: 'photo' | 'video' | 'document',
  options?: {
    notes?: string
    tags?: string[]
    capturedAt?: string
  }
): Promise<EvidenceWithTags> {
  // Step 1: Upload file to storage
  const formData = new FormData()
  formData.append('file', file)
  formData.append('media_type', mediaType)

  const uploadResponse = await fetch(`/api/evidence/${caseId}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json()
    throw new Error(error.error || 'Failed to upload file')
  }

  const uploadData = await uploadResponse.json()

  // Step 2: Create evidence record
  const createData: CreateEvidenceInput = {
    case_id: caseId,
    storage_path: uploadData.storage_path,
    media_type: uploadData.media_type,
    content_type: uploadData.content_type,
    file_name: uploadData.file_name,
    file_size: uploadData.file_size,
    notes: options?.notes,
    tags: options?.tags,
    captured_at: options?.capturedAt,
  }

  const createResponse = await fetch(`/api/evidence/${caseId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createData),
  })

  if (!createResponse.ok) {
    const error = await createResponse.json()
    throw new Error(error.error || 'Failed to create evidence')
  }

  return createResponse.json()
}

/**
 * Update evidence
 */
export async function updateEvidence(
  caseId: string,
  evidenceId: string,
  updates: UpdateEvidenceInput
): Promise<EvidenceWithTags> {
  const response = await fetch(`/api/evidence/${caseId}/${evidenceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update evidence')
  }

  return response.json()
}

/**
 * Delete evidence
 */
export async function deleteEvidence(caseId: string, evidenceId: string): Promise<void> {
  const response = await fetch(`/api/evidence/${caseId}/${evidenceId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete evidence')
  }
}

/**
 * Get signed URL for viewing evidence
 */
export async function getEvidenceSignedUrl(
  caseId: string,
  evidenceId: string
): Promise<string> {
  const response = await fetch(`/api/evidence/${caseId}/${evidenceId}/signed-url`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get signed URL')
  }

  const data = await response.json()
  return data.url
}

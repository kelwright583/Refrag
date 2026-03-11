/**
 * Client-side API function for document ingestion
 */

import type { DocumentIngestionInput, ExtractionResult } from '@/lib/types/ingestion'

export async function ingestDocument(input: DocumentIngestionInput): Promise<ExtractionResult> {
  const formData = new FormData()
  formData.append('file', input.file)
  if (input.assessment_id) formData.append('assessment_id', input.assessment_id)
  if (input.case_id) formData.append('case_id', input.case_id)
  if (input.expected_type) formData.append('expected_type', input.expected_type)

  const response = await fetch('/api/ai/ingest-document', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ingestion failed' }))
    throw new Error(error.error || 'Document ingestion failed')
  }

  return response.json()
}

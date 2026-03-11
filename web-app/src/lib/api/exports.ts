/**
 * Export API functions (client-side)
 */

import { Export, ExportWithDetails, CreateExportInput } from '@/lib/types/export'

/**
 * Get all exports for a case
 */
export async function getExports(caseId: string): Promise<ExportWithDetails[]> {
  const response = await fetch(`/api/cases/${caseId}/exports`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch exports')
  }

  return response.json()
}

/**
 * Create a new export
 */
export async function createExport(
  caseId: string,
  input: CreateExportInput
): Promise<Export> {
  const response = await fetch(`/api/cases/${caseId}/exports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create export')
  }

  return response.json()
}

/**
 * Generate PDF for export
 */
export async function generateExportPDF(exportId: string): Promise<Export> {
  const response = await fetch(`/api/exports/${exportId}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate PDF')
  }

  return response.json()
}

/**
 * Get download URL for export
 */
export async function getExportDownloadUrl(exportId: string): Promise<string> {
  const response = await fetch(`/api/exports/${exportId}/download`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get download URL')
  }

  const data = await response.json()
  return data.url
}

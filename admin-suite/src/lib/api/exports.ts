/**
 * Exports API functions (admin)
 */

export interface Export {
  id: string
  org_id: string
  case_id: string
  report_id: string | null
  export_type: string
  storage_path: string | null
  created_at: string
  case?: {
    case_number: string
    client_name: string
  }
  report?: {
    title: string
    version: number
  }
  org?: {
    name: string
  }
}

/**
 * Get all exports (admin)
 */
export async function getExports(orgId?: string): Promise<Export[]> {
  const params = new URLSearchParams()
  if (orgId) params.append('org_id', orgId)

  const response = await fetch(`/api/admin/exports?${params.toString()}`, {
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
 * Get export download URL (admin)
 */
export async function getExportDownloadUrl(exportId: string): Promise<string> {
  const response = await fetch(`/api/admin/exports/${exportId}/download`, {
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

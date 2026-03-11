/**
 * Audit log API functions (admin)
 */

export interface AuditLog {
  id: string
  staff_user_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, any>
  created_at: string
  staff?: {
    user_id: string
    role: string
  }
}

export interface DataAccessLog {
  id: string
  staff_user_id: string
  org_id: string | null
  resource: string
  resource_id: string | null
  reason: string | null
  created_at: string
  staff?: {
    user_id: string
    role: string
  }
  org?: {
    name: string
  }
}

/**
 * Get audit logs
 */
export async function getAuditLogs(
  type: 'admin' | 'data_access' = 'admin',
  limit: number = 100
): Promise<AuditLog[] | DataAccessLog[]> {
  const params = new URLSearchParams()
  params.append('type', type)
  params.append('limit', limit.toString())

  const response = await fetch(`/api/admin/audit?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch audit logs')
  }

  return response.json()
}

/**
 * React Query hooks for audit logs (admin)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/lib/api/audit'

export function useAuditLogs(
  type: 'admin' | 'data_access' = 'admin',
  limit: number = 100
) {
  return useQuery({
    queryKey: ['admin-audit-logs', type, limit],
    queryFn: () => getAuditLogs(type, limit),
  })
}

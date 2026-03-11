/**
 * React Query hooks for analytics (admin)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { getAnalytics } from '@/lib/api/analytics'

export function useAnalytics(orgId?: string, days: number = 30) {
  return useQuery({
    queryKey: ['admin-analytics', orgId, days],
    queryFn: () => getAnalytics(orgId, days),
  })
}

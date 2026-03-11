/**
 * React Query hooks for exports (admin)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { getExports, getExportDownloadUrl } from '@/lib/api/exports'

export function useExports(orgId?: string) {
  return useQuery({
    queryKey: ['admin-exports', orgId],
    queryFn: () => getExports(orgId),
  })
}

export function useExportDownloadUrl(exportId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin-export-download-url', exportId],
    queryFn: () => getExportDownloadUrl(exportId),
    enabled: enabled && !!exportId,
    staleTime: 1000 * 60 * 55,
  })
}

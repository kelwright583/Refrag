/**
 * React Query hooks for exports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExports,
  createExport,
  generateExportPDF,
  getExportDownloadUrl,
} from '@/lib/api/exports'
import { CreateExportInput } from '@/lib/types/export'

/**
 * Get all exports for a case
 */
export function useExports(caseId: string) {
  return useQuery({
    queryKey: ['exports', caseId],
    queryFn: () => getExports(caseId),
    enabled: !!caseId,
  })
}

/**
 * Create a new export
 */
export function useCreateExport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, input }: { caseId: string; input: CreateExportInput }) =>
      createExport(caseId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exports', variables.caseId] })
    },
  })
}

/**
 * Generate PDF for export
 */
export function useGenerateExportPDF() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (exportId: string) => generateExportPDF(exportId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exports'] })
    },
  })
}

/**
 * Get download URL for export
 */
export function useExportDownloadUrl(exportId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['export-download-url', exportId],
    queryFn: () => getExportDownloadUrl(exportId),
    enabled: enabled && !!exportId,
    staleTime: 1000 * 60 * 55, // 55 minutes (signed URLs are valid for 1 hour)
  })
}
